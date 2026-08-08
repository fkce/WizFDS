import { Injectable, isDevMode } from '@angular/core';
import * as BABYLON from 'babylonjs';
import { BabylonService, tryCreateShaderMaterial } from '../../babylon/babylon.service';
import { SceneLifecycleService, SceneScoped } from '../../babylon/scene-lifecycle.service';
import { SceneAxis, SceneBoundsService } from '../../scene-bounds/scene-bounds.service';
import {
    COLORBAR_TEXELS, colorbarByName, colorbarTexels, DEFAULT_COLORBAR
} from '../../../consts/colorbars';
import { ResultsDirectory } from '../../results/results-directory';
import { isLoadableBoundaryGroup, QuantityGroup } from '../../results/quantity-groups';
import { SmvBlockage, SmvFile, SmvMeshGrid, SmvResultFile } from '../../parsers/smv/smv-file';
import { BfFile } from '../../parsers/bf/bf-file';
import { parseBf } from '../../parsers/bf/bf-parser';
import { BoundaryBuild, buildBoundary } from './boundary-build';
import { BoundarySurface } from './boundary-surface';
import { mergeSpans, TimelineClient, TimelineService, TimeSpan } from '../../timeline/timeline.service';
import {
    Extent, mergeExtents, Quantity, QuantityExtent, QuantityScale, QuantityScaleService,
    ScaleClient, quantityKey
} from '../../scale/quantity-scale.service';

/** One loaded quantity group: its shared material and its per-mesh surfaces. */
interface LoadedGroup {
    readonly material: BABYLON.ShaderMaterial;
    readonly surfaces: readonly BoundarySurface[];
    /** What physical quantity this group is of, and under which key. */
    readonly quantity: Quantity;
    readonly key: string;
    /**
     * What this group contributes to the axis, or null when not one of its
     * files holds a frame - an interrupted run can leave headers with nothing
     * behind them.
     */
    readonly span: TimeSpan | null;
    /** What its drawn values span, or null when none of it is drawn. */
    readonly extent: Extent | null;
    /** The palette texture in use, and the name it was built from. */
    paletteTexture: BABYLON.RawTexture;
    paletteName: string;
}

/**
 * Loads and shows BNDF results (#152): the quantities FDS writes on surfaces.
 *
 * The twin of SliceService in every way that matters - the quantity group is
 * the unit of loading ("Grupa wielkości", CONTEXT.md), one call opens every
 * available file of it, parses it whole (ADR-0016) and puts it on screen at the
 * current moment; loading again disposes it. It is a client of both shared
 * services in the same shape (ADR-0018, ADR-0019), so a boundary and a slice of
 * the same quantity are drawn on one scale without either knowing about the
 * other.
 *
 * Two things are its own. Patches are drawn from the side their `ior` points
 * to and no other (ADR-0020), which is what lets a loaded boundary be looked at
 * from outside the model. And there is no blank toggle: a patch cell with
 * nothing behind it holds the ambient value FDS wrote into a hole, so those
 * cells never reach the index buffer (see buildBoundary).
 */
@Injectable({
    providedIn: 'root'
})
export class BndfService implements SceneScoped, TimelineClient, ScaleClient {

    private grids: readonly SmvMeshGrid[] = [];
    private blockages: readonly SmvBlockage[] = [];
    private directory: ResultsDirectory | null = null;

    private readonly loaded = new Map<QuantityGroup, LoadedGroup>();
    private readonly loading = new Set<QuantityGroup>();

    /** Where the clipping planes stand, in FDS metres. */
    private clipX = 0;
    private clipY = 0;
    private clipZ = 0;

    constructor(
        private babylonService: BabylonService,
        private sceneBounds: SceneBoundsService,
        private timeline: TimelineService,
        private scales: QuantityScaleService,
        sceneLifecycle: SceneLifecycleService
    ) {
        sceneLifecycle.register(this);
        timeline.register(this);
        scales.register(this);
        this.resetClipping();
    }

    /** Everything belongs to the scene that has just been disposed - drop it. */
    public resetSceneState(): void {
        // The meshes and materials died with their scene; dropping the
        // references is the whole of the cleanup.
        this.loaded.clear();
        this.loading.clear();
        this.grids = [];
        this.blockages = [];
        this.directory = null;
        this.resetClipping();
    }

    /**
     * The case the surfaces come from: the parsed `.smv` (grids in metres, obst
     * boxes for blank) and the directory its bytes sit in. Replacing the case
     * disposes whatever the previous one had loaded.
     *
     * Called by ResultsLoaderService, which is also what tells the timeline and
     * the scale that the case has changed - see ADR-0021.
     */
    public setCase(smv: SmvFile, directory: ResultsDirectory): void {
        this.loaded.forEach(group => this.disposeGroup(group));
        this.loaded.clear();
        this.loading.clear();
        this.grids = smv.grids;
        this.blockages = smv.blockages;
        this.directory = directory;
    }

    public canLoad(group: QuantityGroup): boolean {
        return this.directory !== null && isLoadableBoundaryGroup(group);
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
            // What is left of the quantity may now span less than it did, and
            // what is left on screen has to be repainted for it.
            this.scales.refresh();
            return;
        }
        if (!this.canLoad(group) || this.loading.has(group)) return;

        this.loading.add(group);
        try {
            await this.load(group);
        } catch (e) {
            if (isDevMode()) { try { console.error('[BndfService] Failed to load a boundary group', e); } catch { } }
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
        this.loaded.forEach(group => group.surfaces.forEach(surface => surface.showAt(time)));
    }

    /**
     * Pull the clipping planes back to showing the whole model - the planes are
     * coordinates, so they mean nothing once the model changes. See
     * SceneViewService.resetClipping().
     */
    public resetClipping(): void {
        this.clipX = this.sceneBounds.openClipAt('x');
        this.clipY = this.sceneBounds.openClipAt('y');
        this.clipZ = this.sceneBounds.openClipAt('z');
        this.pushClip();
    }

    /**
     * Move a clipping plane.
     *
     * A patch is painted on geometry rather than floating beside it, so a slider
     * that takes half the building away has to take its painted surfaces too -
     * otherwise a skin is left hanging where its obst used to be.
     *
     * @param value the plane's coordinate, in FDS metres
     * @param axis x, y, z
     */
    public clip(value: number, axis: SceneAxis): void {
        if (axis === 'x') { this.clipX = value; }
        else if (axis === 'y') { this.clipY = value; }
        else { this.clipZ = value; }

        this.pushClip();
    }

    /**
     * What the loaded groups hold, per quantity - the scale service's question.
     *
     * Boundary faces all over the model fold into one entry per quantity, which
     * is the point: WALL TEMPERATURE has one scale wherever it is painted, and
     * shares it with nothing else (ADR-0019).
     */
    public quantityExtents(): ReadonlyMap<string, QuantityExtent> {
        const extents = new Map<string, QuantityExtent>();
        this.loaded.forEach(group => {
            const held = extents.get(group.key);
            const merged = mergeExtents([held ?? null, group.extent]);
            if (!merged) return;
            extents.set(group.key, {
                quantity: group.quantity, min: merged.min, max: merged.max
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
            this.setPalette(group, scale.palette);
        });
    }

    private async load(group: QuantityGroup): Promise<void> {
        // Whole files, one read each (ADR-0016): the frames land in memory for
        // the timeline, and what the group contributes to the scale of its
        // quantity comes out of the same pass.
        const parsed: { file: SmvResultFile, bf: BfFile }[] = [];
        for (const file of group.files) {
            const handle = await this.directory.open(file.filename);
            // Not there is an ordinary answer - the .smv lists optimistically.
            if (handle === null) continue;
            parsed.push({ file: file, bf: parseBf(await handle.read(0, handle.size)) });
        }
        if (parsed.length === 0) return;

        // Everything that can fail, before anything that would have to be
        // disposed if it did: the builds are pure, so a throw here leaves the
        // app exactly as it was rather than orphaning a material and a texture.
        const builds: { bf: BfFile, build: BoundaryBuild }[] = [];
        let extent: Extent | null = null;
        for (const entry of parsed) {
            const grid = this.grids.find(candidate => candidate.meshIndex === entry.file.meshIndex);
            // A file naming a mesh the `.smv` does not describe has nowhere to
            // be drawn; the rest of the group still loads.
            if (!grid) continue;
            // A patch states its indices in the mesh whose file it is, even when
            // it reports on an obst of a neighbouring one, so both the grid and
            // the blockages are this file's mesh throughout.
            const build = buildBoundary(entry.bf, grid,
                this.blockages.filter(box => box.meshIndex === entry.file.meshIndex));
            extent = mergeExtents([extent, build.extent]);
            builds.push({ bf: entry.bf, build: build });
        }
        if (builds.length === 0) return;

        const made = await this.createGroupMaterial(group);
        if (made === null) return;

        const scene = this.babylonService.scene;
        const surfaces = builds.map(held => new BoundarySurface(made.material, held.build,
            held.bf.values, held.bf.times, held.bf.pointsPerFrame, scene));

        // The quantity, as the `.smv` names it: the catalog entry rather than
        // the `.bf` header, so the legend says the words the user clicked on.
        const quantity: Quantity = {
            label: group.files[0].longLabel || group.label, unit: group.files[0].unit
        };

        this.loaded.set(group, {
            material: made.material,
            paletteTexture: made.paletteTexture,
            paletteName: made.paletteName,
            surfaces: surfaces,
            quantity: quantity,
            key: quantityKey(quantity),
            span: timeSpanOf(parsed.map(entry => entry.bf)),
            extent: extent
        });

        // The quantity may now span more than it did. Everything drawing it is
        // repainted for the new ends - this group first, which is still holding
        // the placeholder range its material was built with.
        this.scales.refresh();
        // Late arrivals join the show at the moment everything else is showing.
        surfaces.forEach(surface => surface.showAt(this.timeline.time));
    }

    /**
     * The group's material, fully configured before any surface may use it.
     *
     * The range it starts with is a placeholder; the real one arrives from the
     * scale service the moment the group joins `loaded`, and nothing renders in
     * between - both happen in one turn of load().
     */
    private async createGroupMaterial(group: QuantityGroup): Promise<{
        material: BABYLON.ShaderMaterial, paletteTexture: BABYLON.RawTexture, paletteName: string
    } | null> {
        const material = await tryCreateShaderMaterial(this.babylonService,
            { name: `bndf:${group.label}`, shader: 'bndf' }, 'BndfService');
        if (material === null) return null;

        const paletteTexture = this.createPaletteTexture(DEFAULT_COLORBAR);
        material.setFloat('range_min', 0);
        material.setFloat('range_max', 1);
        material.setFloat('clipX', this.clipX);
        material.setFloat('clipY', this.clipY);
        material.setFloat('clipZ', this.clipZ);
        material.setTexture('texture_colorbar_sampler_tex', paletteTexture);
        // One-sided, wound from ior (ADR-0020): the back of a patch is the
        // inside of a solid or the outside of the domain, and neither is
        // anything to look at.
        material.backFaceCulling = true;
        // The patch lies exactly in the plane of the face it describes, so at
        // equal depth the two would fight. Depth-buffer units rather than
        // metres, so it holds at every zoom and on every cell size.
        material.zOffset = 0.2;
        return {
            material: material, paletteTexture: paletteTexture, paletteName: DEFAULT_COLORBAR
        };
    }

    /** Repaint the group's palette, if it is not already the one asked for. */
    private setPalette(group: LoadedGroup, name: string): void {
        if (group.paletteName === name) return;

        const previous = group.paletteTexture;
        group.paletteTexture = this.createPaletteTexture(name);
        group.paletteName = name;
        group.material.setTexture('texture_colorbar_sampler_tex', group.paletteTexture);
        // After the material has taken the new one, so nothing samples a corpse.
        previous.dispose();
    }

    private createPaletteTexture(name: string): BABYLON.RawTexture {
        const texture = new BABYLON.RawTexture(
            colorbarTexels(colorbarByName(name)), 1, COLORBAR_TEXELS,
            BABYLON.Engine.TEXTUREFORMAT_RGBA, this.babylonService.scene,
            false, false, BABYLON.Texture.LINEAR_LINEAR, BABYLON.Engine.TEXTURETYPE_UNSIGNED_BYTE);
        // Sampling walks V: without the clamp the range's top wraps back round
        // to its bottom colour.
        texture.wrapU = BABYLON.Texture.CLAMP_ADDRESSMODE;
        texture.wrapV = BABYLON.Texture.CLAMP_ADDRESSMODE;
        return texture;
    }

    private pushClip(): void {
        this.loaded.forEach(group => {
            group.material.setFloat('clipX', this.clipX);
            group.material.setFloat('clipY', this.clipY);
            group.material.setFloat('clipZ', this.clipZ);
        });
    }

    private disposeGroup(group: LoadedGroup): void {
        group.surfaces.forEach(surface => surface.dispose());
        group.material.dispose();
        group.paletteTexture.dispose();
    }
}

/**
 * What the group spans on the axis: from the earliest first frame of its files
 * to the latest last one. Null when no file of the group has a frame at all.
 */
function timeSpanOf(files: readonly BfFile[]): TimeSpan | null {
    return mergeSpans(files.map(file => file.times.length === 0 ? null : {
        first: file.times[0], last: file.times[file.times.length - 1]
    }));
}
