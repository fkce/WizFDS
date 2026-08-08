import { Injectable, isDevMode } from '@angular/core';
import * as BABYLON from 'babylonjs';
import { BabylonService, tryCreateShaderMaterial } from '../../babylon/babylon.service';
import { SceneLifecycleService, SceneScoped } from '../../babylon/scene-lifecycle.service';
import {
    COLORBAR_TEXELS, colorbarByName, colorbarTexels, DEFAULT_COLORBAR
} from '../../../consts/colorbars';
import { ResultsDirectory } from '../../results/results-directory';
import { QuantityGroup, isLoadableSliceGroup } from '../../results/quantity-groups';
import { SmvBlockage, SmvFile, SmvMeshGrid, SmvResultFile } from '../../parsers/smv/smv-file';
import { SfFile } from '../../parsers/sf/sf-file';
import { parseSf } from '../../parsers/sf/sf-parser';
import { buildSliceGeometry } from './slice-geometry';
import { computeSliceBlank } from './slice-blank';
import { visibleExtent } from './slice-extent';
import { Slice } from './slice';
import { mergeSpans, TimelineClient, TimelineService, TimeSpan } from '../../timeline/timeline.service';
import {
    Quantity, QuantityExtent, QuantityScale, QuantityScaleService, ScaleClient, quantityKey
} from '../../scale/quantity-scale.service';

/** One loaded quantity group: its shared material and its per-mesh planes. */
interface LoadedGroup {
    readonly material: BABYLON.ShaderMaterial;
    readonly slices: readonly Slice[];
    /** What physical quantity this group is of, and under which key. */
    readonly quantity: Quantity;
    readonly key: string;
    /**
     * What this group contributes to the axis, or null when not one of its
     * files holds a frame - an interrupted run can leave headers with nothing
     * behind them. Such a group still loads and still toggles off; it simply
     * never has anything to show.
     */
    readonly span: TimeSpan | null;
    /**
     * What its visible values span, or null when it has none to speak of -
     * the same two reasons as `span`, plus a plane buried whole in matter.
     */
    readonly extent: { readonly min: number, readonly max: number } | null;
    /**
     * The palette texture in use, and the name it was built from. Both move
     * when the quantity's palette changes, which is why neither is readonly:
     * the group outlives any one choice of colours.
     */
    colorbar: BABYLON.RawTexture;
    colorbarName: string;
}

/**
 * Loads and shows SLCF results (#149).
 *
 * The unit of loading is the quantity group ("Grupa wielkości", CONTEXT.md):
 * one call opens every available file of the group - all meshes at once -
 * through the results directory, parses them whole (ADR-0016), and puts them
 * on screen at the current frame. Loading again disposes it: two states, not
 * three.
 *
 * One ShaderMaterial per group, built with await *before* any Slice exists:
 * the uniforms - the value range, the colorbar, the blank toggle - are exactly
 * the things the group's planes share.
 *
 * It is a client of both shared services, and in the same shape each time
 * (ADR-0018, ADR-0019): it says what it holds and is told what to do with it -
 * which moment to show, and which scale to draw it on. Neither service knows
 * what a slice is. The `.sf` files resolve a moment against their own frame
 * times; the range and the palette arrive per quantity, so the same TEMPERATURE
 * looks the same here as it will on a boundary (#152).
 */
@Injectable({
  providedIn: 'root'
})
export class SliceService implements SceneScoped, TimelineClient, ScaleClient {

  private grids: readonly SmvMeshGrid[] = [];
  private blockages: readonly SmvBlockage[] = [];
  private directory: ResultsDirectory | null = null;

  private readonly loaded = new Map<QuantityGroup, LoadedGroup>();
  private readonly loading = new Set<QuantityGroup>();

  /** True culls blanked cells, false shows the data under them. */
  private cullBlank = true;

  constructor(
    private babylonService: BabylonService,
    private timeline: TimelineService,
    private scales: QuantityScaleService,
    sceneLifecycle: SceneLifecycleService
  ) {
    sceneLifecycle.register(this);
    timeline.register(this);
    scales.register(this);
  }

  /** Everything belongs to the scene that has just been disposed - drop it. */
  public resetSceneState(): void {
    // The meshes and materials died with their scene; dropping the references
    // is the whole of the cleanup.
    this.loaded.clear();
    this.loading.clear();
    this.grids = [];
    this.blockages = [];
    this.directory = null;
    this.cullBlank = true;
  }

  /**
   * The case the slices come from: the parsed `.smv` (grids in metres, obst
   * boxes for blank) and the directory its bytes sit in. Replacing the case
   * disposes whatever the previous one had loaded.
   */
  public setCase(smv: SmvFile, directory: ResultsDirectory): void {
    this.loaded.forEach(group => this.disposeGroup(group));
    this.loaded.clear();
    this.loading.clear();
    this.grids = smv.grids;
    this.blockages = smv.blockages;
    this.directory = directory;
    // Another simulation: a position from the previous one means nothing here,
    // and neither does a range someone cut to fit the last one. Both calls sit
    // here because SLCF is still the only format that knows a case has changed
    // - the seam they belong in is owed to #152 (ADR-0018, ADR-0019).
    this.timeline.resetForNewCase();
    this.scales.resetForNewCase();
  }

  public canLoad(group: QuantityGroup): boolean {
    return this.directory !== null && isLoadableSliceGroup(group);
  }

  public isLoaded(group: QuantityGroup): boolean {
    return this.loaded.has(group);
  }

  public isLoading(group: QuantityGroup): boolean {
    return this.loading.has(group);
  }

  /** Load the group, or - loaded already - put it away. The panel's click. */
  public async toggleGroup(group: QuantityGroup): Promise<void> {
    const held = this.loaded.get(group);
    if (held) {
      this.disposeGroup(held);
      this.loaded.delete(group);
      // What is left of the quantity may now span less than it did, and what
      // is left on screen has to be repainted for it.
      this.scales.refresh();
      return;
    }
    if (!this.canLoad(group) || this.loading.has(group)) return;

    this.loading.add(group);
    try {
      await this.load(group);
    } catch (e) {
      if (isDevMode()) { try { console.error('[SliceService] Failed to load a slice group', e); } catch { } }
    } finally {
      this.loading.delete(group);
    }
  }

  /** What the loaded groups span together, or null while nothing is loaded. */
  public timeSpan(): TimeSpan | null {
    const spans: (TimeSpan | null)[] = [];
    this.loaded.forEach(group => spans.push(group.span));
    return mergeSpans(spans);
  }

  /** The timeline's moment, resolved by each file against its own frame times. */
  public showAt(time: number): void {
    this.loaded.forEach(group => group.slices.forEach(slice => slice.showAt(time)));
  }

  /** The "Blank" toggle (CONTEXT.md): culled matter against visible data. */
  public toggleBlank(): void {
    this.cullBlank = !this.cullBlank;
    this.loaded.forEach(group => group.material.setInt('is_blank', this.cullBlank ? 1 : 0));
  }

  /**
   * What the loaded groups hold, per quantity - the scale service's question.
   *
   * Two planes of the same TEMPERATURE fold into one entry here, which is the
   * whole point: the position a slice was cut at splits a *group*, never a
   * quantity (ADR-0019). A group with nothing visible in it contributes
   * nothing rather than an empty range.
   */
  public quantityExtents(): ReadonlyMap<string, QuantityExtent> {
    const extents = new Map<string, QuantityExtent>();
    this.loaded.forEach(group => {
      if (group.extent === null) return;
      const held = extents.get(group.key);
      extents.set(group.key, held === undefined
        ? { quantity: group.quantity, min: group.extent.min, max: group.extent.max }
        : {
          quantity: held.quantity,
          min: Math.min(held.min, group.extent.min),
          max: Math.max(held.max, group.extent.max)
        });
    });
    return extents;
  }

  /** Draw that quantity on that scale: two uniforms, and the palette texture. */
  public applyScale(quantity: string, scale: QuantityScale): void {
    this.loaded.forEach(group => {
      if (group.key !== quantity) return;
      group.material.setFloat('range_min', scale.min);
      group.material.setFloat('range_max', scale.max);
      this.setColorbar(group, scale.colorbar);
    });
  }

  private async load(group: QuantityGroup): Promise<void> {
    // Whole files, one read each (#149): frames land in memory for #150's
    // timeline, and what the group contributes to the scale of its quantity
    // comes out of the same pass.
    const parsed: { file: SmvResultFile, sf: SfFile }[] = [];
    for (const file of group.files) {
      const handle = await this.directory.open(file.filename);
      // Not there is an ordinary answer - the .smv lists optimistically.
      if (handle === null) continue;
      parsed.push({ file: file, sf: parseSf(await handle.read(0, handle.size)) });
    }
    if (parsed.length === 0) return;

    const made = await this.createGroupMaterial(group);
    if (made === null) return;

    const scene = this.babylonService.scene;
    const slices: Slice[] = [];
    let extent: { min: number, max: number } | null = null;
    for (const entry of parsed) {
      const grid = this.grids.find(candidate => candidate.meshIndex === entry.file.meshIndex);
      if (!grid) continue;
      const geometry = buildSliceGeometry(entry.sf.bounds, grid);
      const blank = computeSliceBlank(entry.sf.bounds,
        this.blockages.filter(box => box.meshIndex === entry.file.meshIndex));
      // The same mask decides what is drawn and what may set the scale, so the
      // two cannot drift apart.
      extent = widen(extent,
        visibleExtent(entry.sf.values, blank, entry.sf.pointsPerFrame));
      slices.push(new Slice(made.material, geometry, blank,
        entry.sf.values, entry.sf.times, entry.sf.pointsPerFrame, scene));
    }
    if (slices.length === 0) {
      made.material.dispose();
      made.colorbar.dispose();
      return;
    }

    // The quantity, as the `.smv` names it: the catalog entry rather than the
    // `.sf` header, so the legend says the words the user clicked on.
    const quantity: Quantity = {
      label: group.files[0].longLabel, unit: group.files[0].unit
    };

    this.loaded.set(group, {
      material: made.material,
      colorbar: made.colorbar,
      colorbarName: made.colorbarName,
      slices: slices,
      quantity: quantity,
      key: quantityKey(quantity),
      span: timeSpanOf(parsed.map(entry => entry.sf)),
      extent: extent
    });

    // The quantity may now span more than it did. Everything drawing it is
    // repainted for the new ends - this group first, which is still holding
    // the placeholder range its material was built with.
    this.scales.refresh();
    // Late arrivals join the show at the moment everything else is showing.
    slices.forEach(slice => slice.showAt(this.timeline.time));
  }

  /**
   * The group's material, fully configured before any Slice may use it.
   *
   * The range it starts with is a placeholder. The real one arrives from the
   * scale service the moment the group joins `loaded`, and nothing renders in
   * between - both happen in one turn of load().
   */
  private async createGroupMaterial(group: QuantityGroup): Promise<{
    material: BABYLON.ShaderMaterial, colorbar: BABYLON.RawTexture, colorbarName: string
  } | null> {
    const material = await tryCreateShaderMaterial(this.babylonService,
      { name: `slice:${group.label}`, shader: 'slice' }, 'SliceService');
    if (material === null) return null;

    const colorbar = this.createColorbarTexture(DEFAULT_COLORBAR);
    material.setFloat('range_min', 0);
    material.setFloat('range_max', 1);
    material.setInt('is_blank', this.cullBlank ? 1 : 0);
    material.setTexture('texture_colorbar_sampler_tex', colorbar);
    material.backFaceCulling = false;
    material.zOffset = 0.2;
    return { material: material, colorbar: colorbar, colorbarName: DEFAULT_COLORBAR };
  }

  /** Repaint the group's palette, if it is not already the one asked for. */
  private setColorbar(group: LoadedGroup, name: string): void {
    if (group.colorbarName === name) return;

    const previous = group.colorbar;
    group.colorbar = this.createColorbarTexture(name);
    group.colorbarName = name;
    group.material.setTexture('texture_colorbar_sampler_tex', group.colorbar);
    // After the material has taken the new one, so nothing samples a corpse.
    previous.dispose();
  }

  private createColorbarTexture(name: string): BABYLON.RawTexture {
    const texture = new BABYLON.RawTexture(
      colorbarTexels(colorbarByName(name)), 1, COLORBAR_TEXELS,
      BABYLON.Engine.TEXTUREFORMAT_RGBA, this.babylonService.scene,
      false, false, BABYLON.Texture.LINEAR_LINEAR, BABYLON.Engine.TEXTURETYPE_UNSIGNED_BYTE);
    // Sampling walks V: without the clamp the range's top wraps back round to
    // its bottom colour. (The old code clamped U and R - and sampled a constant.)
    texture.wrapU = BABYLON.Texture.CLAMP_ADDRESSMODE;
    texture.wrapV = BABYLON.Texture.CLAMP_ADDRESSMODE;
    return texture;
  }

  private disposeGroup(group: LoadedGroup): void {
    group.slices.forEach(slice => slice.dispose());
    group.material.dispose();
    group.colorbar.dispose();
  }
}

/** The span covering both, or whichever of them is one. */
function widen(
  held: { min: number, max: number } | null, extent: { min: number, max: number } | null
): { min: number, max: number } | null {
  if (extent === null) return held;
  if (held === null) return extent;
  return { min: Math.min(held.min, extent.min), max: Math.max(held.max, extent.max) };
}

/**
 * What the group spans on the axis: from the earliest first frame of its files
 * to the latest last one. Null when no file of the group has a frame at all.
 */
function timeSpanOf(files: readonly SfFile[]): TimeSpan | null {
    return mergeSpans(files.map(file => file.times.length === 0 ? null : {
        first: file.times[0], last: file.times[file.times.length - 1]
    }));
}
