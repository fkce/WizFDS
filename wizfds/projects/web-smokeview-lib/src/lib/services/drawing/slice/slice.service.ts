import { Injectable, isDevMode } from '@angular/core';
import * as BABYLON from 'babylonjs';
import { BabylonService, tryCreateShaderMaterial } from '../../babylon/babylon.service';
import { SceneLifecycleService, SceneScoped } from '../../babylon/scene-lifecycle.service';
import { colorbars as Colorbars } from '../../../consts/colorbars';
import { ResultsDirectory } from '../../results/results-directory';
import { QuantityGroup, isLoadableSliceGroup } from '../../results/quantity-groups';
import { SmvBlockage, SmvFile, SmvMeshGrid, SmvResultFile } from '../../parsers/smv/smv-file';
import { SfFile } from '../../parsers/sf/sf-file';
import { parseSf } from '../../parsers/sf/sf-parser';
import { buildSliceGeometry } from './slice-geometry';
import { computeSliceBlank } from './slice-blank';
import { Slice } from './slice';
import { mergeSpans, TimelineClient, TimelineService, TimeSpan } from '../../timeline/timeline.service';

/** One loaded quantity group: its shared material and its per-mesh planes. */
interface LoadedGroup {
    readonly material: BABYLON.ShaderMaterial;
    readonly colorbar: BABYLON.RawTexture;
    readonly slices: readonly Slice[];
    /**
     * What this group contributes to the axis, or null when not one of its
     * files holds a frame - an interrupted run can leave headers with nothing
     * behind them. Such a group still loads and still toggles off; it simply
     * never has anything to show.
     */
    readonly span: TimeSpan | null;
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
 * the uniforms - the value range (computed over the whole group, per
 * "Zakres wielkości"), the colorbar, the blank toggle - are exactly the
 * things the group's planes share. #151 will replace the computed range with
 * the global per-quantity one; the uniforms are its seam.
 *
 * This is the timeline's first client (#150): it reports what it holds and is
 * told which moment to show, and each `.sf` file resolves that moment against
 * its own frame times.
 */
@Injectable({
  providedIn: 'root'
})
export class SliceService implements SceneScoped, TimelineClient {

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
    sceneLifecycle: SceneLifecycleService
  ) {
    sceneLifecycle.register(this);
    timeline.register(this);
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
    // Another simulation: a position from the previous one means nothing here.
    this.timeline.resetForNewCase();
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

  private async load(group: QuantityGroup): Promise<void> {
    // Whole files, one read each (#149): frames land in memory for #150's
    // timeline, and the group range comes out of the same pass.
    const parsed: { file: SmvResultFile, sf: SfFile }[] = [];
    for (const file of group.files) {
      const handle = await this.directory.open(file.filename);
      // Not there is an ordinary answer - the .smv lists optimistically.
      if (handle === null) continue;
      parsed.push({ file: file, sf: parseSf(await handle.read(0, handle.size)) });
    }
    if (parsed.length === 0) return;

    const made = await this.createGroupMaterial(group, parsed.map(entry => entry.sf));
    if (made === null) return;

    const scene = this.babylonService.scene;
    const slices: Slice[] = [];
    for (const entry of parsed) {
      const grid = this.grids.find(candidate => candidate.meshIndex === entry.file.meshIndex);
      if (!grid) continue;
      const geometry = buildSliceGeometry(entry.sf.bounds, grid);
      const blank = computeSliceBlank(entry.sf.bounds,
        this.blockages.filter(box => box.meshIndex === entry.file.meshIndex));
      slices.push(new Slice(made.material, geometry, blank,
        entry.sf.values, entry.sf.times, entry.sf.pointsPerFrame, scene));
    }
    if (slices.length === 0) {
      made.material.dispose();
      made.colorbar.dispose();
      return;
    }

    this.loaded.set(group, {
      material: made.material, colorbar: made.colorbar, slices: slices,
      span: timeSpanOf(parsed.map(entry => entry.sf))
    });
    // Late arrivals join the show at the moment everything else is showing.
    slices.forEach(slice => slice.showAt(this.timeline.time));
  }

  /** The group's material, fully configured before any Slice may use it. */
  private async createGroupMaterial(
    group: QuantityGroup, parsed: readonly SfFile[]
  ): Promise<{ material: BABYLON.ShaderMaterial, colorbar: BABYLON.RawTexture } | null> {
    const material = await tryCreateShaderMaterial(this.babylonService,
      { name: `slice:${group.label}`, shader: 'slice' }, 'SliceService');
    if (material === null) return null;

    const colorbar = new BABYLON.RawTexture(
      Colorbars.rainbow.colors, 1, Colorbars.rainbow.number,
      BABYLON.Engine.TEXTUREFORMAT_RGBA, this.babylonService.scene,
      false, false, BABYLON.Texture.LINEAR_LINEAR, BABYLON.Engine.TEXTURETYPE_UNSIGNED_BYTE);
    // Sampling walks V: without the clamp the range's top wraps back round to
    // its bottom colour. (The old code clamped U and R - and sampled a constant.)
    colorbar.wrapU = BABYLON.Texture.CLAMP_ADDRESSMODE;
    colorbar.wrapV = BABYLON.Texture.CLAMP_ADDRESSMODE;

    const range = valueRangeOf(parsed);
    material.setFloat('range_min', range.min);
    material.setFloat('range_max', range.max);
    material.setInt('is_blank', this.cullBlank ? 1 : 0);
    material.setTexture('texture_colorbar_sampler_tex', colorbar);
    material.backFaceCulling = false;
    material.zOffset = 0.2;
    return { material: material, colorbar: colorbar };
  }

  private disposeGroup(group: LoadedGroup): void {
    group.slices.forEach(slice => slice.dispose());
    group.material.dispose();
    group.colorbar.dispose();
  }
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

/**
 * The interim colour range: min/max over every frame of every file of the
 * loaded group - "Zakres wielkości" without #151's override and legend yet.
 */
function valueRangeOf(files: readonly SfFile[]): { min: number, max: number } {
    let min = Number.POSITIVE_INFINITY;
    let max = Number.NEGATIVE_INFINITY;
    for (const file of files) {
        for (let at = 0; at < file.values.length; at++) {
            const value = file.values[at];
            if (value < min) min = value;
            if (value > max) max = value;
        }
    }
    // A group of empty files has no range; any non-degenerate pair will do.
    if (min > max) return { min: 0, max: 1 };
    return { min: min, max: max };
}
