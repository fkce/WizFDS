import { Injectable, isDevMode } from '@angular/core';
import { BabylonService } from '../../babylon/babylon.service';
import * as BABYLON from 'babylonjs';
import { forEach, max, find, cloneDeep, sortBy, toNumber } from 'lodash';
import { HelpersService } from '../../helpers/helpers.service';
import { HoleService } from '../hole/hole.service';
import { IObst, IHole } from '../interfaces';

@Injectable({
  providedIn: 'root'
})
export class ObstService {

  obsts: any = [];
  surfs: any = [];
  holes: any = [];

  pickedObst: IObst;
  pickedObstMesh;
  pickedObstMaterial: BABYLON.StandardMaterial;

  vertices: number[] = [];
  normals: number[] = [];
  colors: number[] = [];
  indices: number[] = [];
  positions: BABYLON.Vector3[] = [];
  
  // Track ranges of standard obsts that need normal computation
  standardObstRanges: {start: number, end: number, vertexStart: number, indexStart: number, indexEnd: number}[] = [];

  mesh;
  meshBackCap;
  vertexData: BABYLON.VertexData;
  material: BABYLON.ShaderMaterial;
  materialBackCap: BABYLON.ShaderMaterial;

  clipX: number = 0.0;
  clipY: number = 0.0;
  clipZ: number = 100.0;
  clipXNorm: number = -1.1;
  clipYNorm: number = -1.1;
  clipZNorm: number = 1.1;

  constructor(
    private babylonService: BabylonService,
    private helperService: HelpersService,
    private holeService: HoleService
  ) {
  }

  /**
   * Clip obst mesh
   * @param value percentage
   * @param direction x, y, z direction
   */
  public clip(value: number, direction: string) {

    // Use global mesh bounds instead of obst mesh bounds for clipping calibration
    // This ensures that clip sliders are calibrated against all geometry (meshes) in the scene
    const globalBounds = {
      x: this.helperService.normXMax || 1,
      y: this.helperService.normYMax || 1,
      z: this.helperService.normZMax || 1
    };
    
    if (direction == 'x') {
      this.clipX = value;
      let clip = (value == 100) ? 1.1 : globalBounds.x * (value / 100);
      clip = (value == 0) ? -1.1 : clip;
      this.mesh.material.setFloat("clipX", clip);
      this.meshBackCap.material.setFloat("clipX", clip);
      // Update transparent mesh material if it exists
      if ((this as any).materialTransparent) {
        (this as any).materialTransparent.setFloat("clipX", clip);
      }
      this.clipXNorm = clip;

    }
    else if (direction == 'y') {
      this.clipY = value;
      let clip = (value == 100) ? 1.1 : globalBounds.y * (value / 100);
      clip = (value == 0) ? -1.1 : clip;
      this.mesh.material.setFloat("clipY", clip);
      this.meshBackCap.material.setFloat("clipY", clip);
      // Update transparent mesh material if it exists
      if ((this as any).materialTransparent) {
        (this as any).materialTransparent.setFloat("clipY", clip);
      }
      this.clipYNorm = clip;
    }
    else if (direction == 'z') {
      this.clipZ = value;
      let clip = (value == 100) ? 1.1 : globalBounds.z * (value / 100);
      clip = (value == 0) ? -1.1 : clip;
      this.mesh.material.setFloat("clipZ", clip);
      this.meshBackCap.material.setFloat("clipZ", clip);
      // Update transparent mesh material if it exists
      if ((this as any).materialTransparent) {
        (this as any).materialTransparent.setFloat("clipZ", clip);
      }
      this.clipZNorm = clip;
    }
  }

  /**
   * Render geometry from json data
   * @param data 
   */
  public renderJson(data: any) {

    // Clear arrays
    this.vertices.length = 0;
    this.colors.length = 0;
    this.indices.length = 0;
    this.positions.length = 0;

    // Assign data
    this.vertices = data.vertices;
    this.colors = data.colors;
    this.indices = data.indices;

    // Generate positions
    for (let i = 0; i < this.vertices.length; i += 3) {
      this.positions.push(new BABYLON.Vector3(this.vertices[i], this.vertices[i + 1], this.vertices[i + 2]));
    }

    // Render geometry
    this.render();
  }

  public renderWiz() {

  }

  public renderFds() {
    // upload fds file ... 

  }

  /**
   * Reder obsts
   */
  public renderObsts() {

    // Normalize holes first (before assigning to obsts)
    this.normalizeHoles();

    // Assign holes to obsts
    this.assignHolesToObsts();

    // Prepare normalized geometry and colors
    this.normalizeObsts();

    // Update obsts vertex data
    this.updateObstsVertexData();

    // Render data
    this.render();

    // Set camera
    let bounding = cloneDeep(this.mesh.getBoundingInfo().boundingSphere);
    this.babylonService.camera.setPosition(new BABYLON.Vector3(bounding.centerWorld.x, bounding.centerWorld.y, bounding.centerWorld.z + 2));
    this.babylonService.camera.setTarget(bounding.centerWorld);
  }

  /**
   * Normalize obsts
   */
  private normalizeObsts(): void {

    // Check if we need to calculate our own bounds (if meshes haven't been processed)
    let shouldCalculateBounds = (this.helperService.normDelta === 1 && 
                                this.helperService.normXMin === 0 && 
                                this.helperService.normYMin === 0 && 
                                this.helperService.normZMin === 0);

    if (shouldCalculateBounds && this.obsts && this.obsts.length > 0) {
      // Calculate bounds from obsts only
      let xMin = this.obsts[0].xb.x1, yMin = this.obsts[0].xb.y1, zMin = this.obsts[0].xb.z1;
      let xMax = this.obsts[0].xb.x2, yMax = this.obsts[0].xb.y2, zMax = this.obsts[0].xb.z2;
      
      if (this.obsts.length > 1) {
        forEach(this.obsts, (obst: IObst) => {
          const xb = obst.xb;
          xMin = xb.x1 < xMin ? xb.x1 : xMin;
          xMax = xb.x2 > xMax ? xb.x2 : xMax;
          yMin = xb.y1 < yMin ? xb.y1 : yMin;
          yMax = xb.y2 > yMax ? xb.y2 : yMax;
          zMin = xb.z1 < zMin ? xb.z1 : zMin;
          zMax = xb.z2 > zMax ? xb.z2 : zMax;
        });
      }

      // Update helper service with obst bounds
      this.helperService.normXMin = xMin;
      this.helperService.normYMin = yMin;
      this.helperService.normZMin = zMin;

      let deltaX = xMax - xMin;
      let deltaY = yMax - yMin;
      let deltaZ = zMax - zMin;
      this.helperService.normDelta = max([deltaX, deltaY, deltaZ]);

      // Calculate normalized maximum values
      let normXMax = ((xMax + (xMin < 0 ? -xMin : xMin)) / this.helperService.normDelta);
      let normYMax = ((yMax + (yMin < 0 ? -yMin : yMin)) / this.helperService.normDelta);
      let normZMax = ((zMax + (zMin < 0 ? -zMin : zMin)) / this.helperService.normDelta);

      this.helperService.normXMax = normXMax;
      this.helperService.normYMax = normYMax;
      this.helperService.normZMax = normZMax;
    }

    let delta = this.helperService.normDelta;
    let xMin = this.helperService.normXMin;
    let yMin = this.helperService.normYMin;
    let zMin = this.helperService.normZMin;

    let color = [1, 1, 1, 1];

    // Normalize ...
    forEach(this.obsts, (obst: IObst) => {

      // Normalize xb
      let xb = cloneDeep(obst.xb);
      forEach(xb, (o, key) => {
        xb[key] = toNumber(o);
      });

      xb.x1 += (xMin < 0) ? -xMin : xMin;
      obst.vis.xbNorm.x1 = xb.x1 / delta;

      xb.x2 += (xMin < 0) ? -xMin : xMin;
      obst.vis.xbNorm.x2 = xb.x2 / delta;

      xb.y1 += (yMin < 0) ? -yMin : yMin;
      obst.vis.xbNorm.y1 = xb.y1 / delta;
      xb.y2 += (yMin < 0) ? -yMin : yMin;
      obst.vis.xbNorm.y2 = xb.y2 / delta;

      xb.z1 += (zMin < 0) ? -zMin : zMin;
      obst.vis.xbNorm.z1 = xb.z1 / delta;
      xb.z2 += (zMin < 0) ? -zMin : zMin;
      obst.vis.xbNorm.z2 = xb.z2 / delta;

      // Normalize color
      const surfId = (obst as any)?.surf?.surf_id?.id;
      let surf = surfId !== undefined ? find(this.surfs, (s: any) => s && s.id === surfId) : undefined;
      if (!surf) {
        // Fallback color if surf is missing or malformed
        surf = { color: { rgb: [255, 208, 0] }, transparency: 0 } as any;
        if (isDevMode()) { try { console.warn('[ObstService] Missing surf for obst, using fallback color', obst); } catch {} }
      }
      // Convert FDS transparency to BabylonJS alpha (direct mapping)
      // FDS: transparency=1 means visible (opaque), transparency=0 means invisible (transparent)
      // BabylonJS: alpha=1 means opaque, alpha=0 means transparent
      const alpha = surf.transparency;
      color = [surf.color.rgb[0] / 255, surf.color.rgb[1] / 255, surf.color.rgb[2] / 255].concat([alpha]);
      obst.vis.colorNorm = color;

      // Normalize holes if they exist
      if (obst.holes && obst.holes.length > 0) {
        obst.holes.forEach((hole) => {
          if (!hole.vis) {
            hole.vis = { 
              xbNorm: { x1: 0, x2: 0, y1: 0, y2: 0, z1: 0, z2: 0 },
              colorNorm: [1, 1, 1, 1] // Default white color for holes
            };
          }
          
          // Normalize hole xb coordinates using the same transformation as parent obst
          let holeXb = cloneDeep(hole.xb);
          forEach(holeXb, (o, key) => {
            holeXb[key] = toNumber(o);
          });

          holeXb.x1 += (xMin < 0) ? -xMin : xMin;
          hole.vis.xbNorm.x1 = holeXb.x1 / delta;

          holeXb.x2 += (xMin < 0) ? -xMin : xMin;
          hole.vis.xbNorm.x2 = holeXb.x2 / delta;

          holeXb.y1 += (yMin < 0) ? -yMin : yMin;
          hole.vis.xbNorm.y1 = holeXb.y1 / delta;
          holeXb.y2 += (yMin < 0) ? -yMin : yMin;
          hole.vis.xbNorm.y2 = holeXb.y2 / delta;

          holeXb.z1 += (zMin < 0) ? -zMin : zMin;
          hole.vis.xbNorm.z1 = holeXb.z1 / delta;
          holeXb.z2 += (zMin < 0) ? -zMin : zMin;
          hole.vis.xbNorm.z2 = holeXb.z2 / delta;
        });
      }

    });
  }

  /**
   * Update obsts vertex data - separate opaque and transparent obsts
   */
  public updateObstsVertexData(): void {

    // Clear arrays for opaque obsts
    this.vertices.length = 0;
    this.colors.length = 0;
    this.indices.length = 0;
    this.positions.length = 0;
    this.normals.length = 0;
    this.standardObstRanges.length = 0;

    // Arrays for transparent obsts
    const transparentVertices = [];
    const transparentColors = [];
    const transparentIndices = [];

    let opaqueIndex = 0;
    let transparentIndex = 0;
    
    // Track if we have any CSG meshes (for backCap compatibility)
    let hasCSGMeshes = false;

    forEach(this.obsts, (obst: IObst) => {
      const surfId = (obst as any)?.surf?.surf_id?.id;
      const surf = surfId !== undefined ? find(this.surfs, (s: any) => s && s.id === surfId) : undefined;
      const isTransparent = surf && surf.transparency < 1;
      let processedWithHoles = false;

      // Check if obst has holes and can have holes
      if (obst.holes && obst.holes.length > 0 && this.holeService.canHaveHoles(obst)) {
        try {
          // Process obst with holes using CSG
          const meshWithHoles = this.holeService.processObstWithHoles(obst, this.babylonService.scene);
          
          if (meshWithHoles) {
            
            // Extract vertices and indices from CSG mesh
            const positions = meshWithHoles.getVerticesData(BABYLON.VertexBuffer.PositionKind);
            const indices = meshWithHoles.getIndices();
            const normals = meshWithHoles.getVerticesData(BABYLON.VertexBuffer.NormalKind);
            
            if (isDevMode()) console.log('[ObstService] Extracted data:', {
              positionsLength: positions?.length,
              indicesLength: indices?.length,
              normalsLength: normals?.length,
              vertices: positions?.length ? positions.length / 3 : 0
            });
            
            if (positions && indices && normals) {
              // Generate colors for each vertex (same color for all vertices of this obst)
              const colorArray: number[] = [];
              for (let i = 0; i < positions.length / 3; i++) {
                colorArray.push(...obst.vis.colorNorm);
              }
              
              // Convert indices to proper format - fix the indexing
              const adjustedIndices: number[] = [];
              const currentVertexCount = isTransparent ? transparentVertices.length / 3 : this.vertices.length / 3;
              if (isDevMode()) console.log('[ObstService] Index adjustment:', {
                originalIndices: indices.length,
                currentVertexCount: currentVertexCount,
                firstFewIndices: indices.slice(0, 6),
                obstId: obst.id
              });
              
              // Manifold winds its triangles the opposite way from HelpersService
              // .getIndices(). Both end up in one buffer feeding one back-cap mesh,
              // which draws a single facing - mixed winding paints the outside of
              // these obsts red instead of capping the cut. Flip them to match.
              const flippedIndices: number[] = [];
              for (let i = 0; i < indices.length; i += 3) {
                flippedIndices.push(indices[i], indices[i + 2], indices[i + 1]);
                adjustedIndices.push(
                  indices[i] + currentVertexCount,
                  indices[i + 2] + currentVertexCount,
                  indices[i + 1] + currentVertexCount
                );
              }

              // Recompute rather than reuse Manifold's normals: those follow its
              // own winding, and a normal facing away from its triangle zeroes the
              // diffuse term in obst.fragment.wgsl, leaving the obst at ambient
              // brightness only - visibly darker than everything around it.
              const csgNormals = new Array(positions.length).fill(0);
              BABYLON.VertexData.ComputeNormals(positions, flippedIndices, csgNormals);
              
              if (isDevMode()) console.log('[ObstService] Adjusted indices:', {
                firstFewAdjusted: adjustedIndices.slice(0, 6),
                totalAdjusted: adjustedIndices.length
              });
              
              if (isTransparent) {
                transparentVertices.push(...positions);
                transparentColors.push(...colorArray);
                transparentIndices.push(...adjustedIndices);
                // Note: We'd need separate normals array for transparent, but skipping for now
                transparentIndex++;
              } else {
                this.vertices.push(...positions);
                this.colors.push(...colorArray);
                this.indices.push(...adjustedIndices);
                this.normals.push(...csgNormals);
                // Don't increment opaqueIndex for CSG meshes since they have variable vertex count
                // opaqueIndex is used for standard box calculation which assumes 24 vertices per obst
              }
              
              processedWithHoles = true;
              hasCSGMeshes = true; // Mark that we have CSG meshes
            } else {
              if (isDevMode()) console.warn('[ObstService] No positions or indices extracted from CSG mesh');
            }
            
            // Clean up the temporary mesh
            meshWithHoles.dispose();
          } else {
            if (isDevMode()) console.warn('[ObstService] CSG processing returned null, falling back to standard rendering');
          }
        } catch (error) {
          if (isDevMode()) console.error('[ObstService] Error processing obst with holes, falling back to standard rendering:', error);
          // Fall through to standard processing
        }
      } else {
        if (obst.holes && obst.holes.length > 0) {
          if (isDevMode()) console.log('[ObstService] Obst has holes but permit_hole is false:', obst.id, 'permit_hole:', obst.permit_hole);
        }
      }

      // Standard obst processing (no holes or holes processing failed)
      if (!processedWithHoles) {
        if (isTransparent) {
          // Add to transparent mesh
          transparentVertices.push(...this.helperService.getVerticesFromXb(obst.vis.xbNorm));
          transparentColors.push(...this.helperService.getColors(obst.vis.colorNorm));
          transparentIndices.push(...this.helperService.getIndices(transparentIndex));
          transparentIndex++;
        } else {
          // Add to opaque mesh
          const currentVertexCount = this.vertices.length / 3;
          const currentVertexStart = this.vertices.length;
          this.vertices.push(...this.helperService.getVerticesFromXb(obst.vis.xbNorm));
          const currentVertexEnd = this.vertices.length;
          this.colors.push(...this.helperService.getColors(obst.vis.colorNorm));
          
          // For standard obsts, we need to adjust indices based on current vertex count, not opaqueIndex
          // getIndices() returns indices for a single box (24 vertices), but we need to offset them
          const standardIndices = this.helperService.getIndices(0); // Get base indices for a single box
          const adjustedStandardIndices = standardIndices.map(index => index + currentVertexCount);
          const currentIndexStart = this.indices.length;
          this.indices.push(...adjustedStandardIndices);

          // Track this range for normal computation later. Recording where this
          // obst's indices land saves re-scanning the whole index array per obst.
          this.standardObstRanges.push({
            start: currentVertexStart,
            end: currentVertexEnd,
            vertexStart: currentVertexCount,
            indexStart: currentIndexStart,
            indexEnd: this.indices.length
          });
          
          // Add placeholder normals for this standard obst (will be computed later)
          const placeholderNormals = new Array(72).fill(0); // 24 vertices * 3 components = 72
          this.normals.push(...placeholderNormals);
          
          opaqueIndex++;
        }
      }
    });

    // Generate positions for opaque mesh
    for (let i = 0; i < this.vertices.length; i += 3) {
      this.positions.push(new BABYLON.Vector3(this.vertices[i], this.vertices[i + 1], this.vertices[i + 2]));
    }

    // Store transparent data for later use
    (this as any).transparentVertices = transparentVertices;
    (this as any).transparentColors = transparentColors;
    (this as any).transparentIndices = transparentIndices;
    
    // Debug info
    if (isDevMode()) { try {
      console.debug('[ObstService] Vertex data split:', {
        opaqueCount: opaqueIndex,
        transparentCount: transparentIndex,
        opaqueVertices: this.vertices.length,
        transparentVertices: transparentVertices.length,
        opaqueIndices: this.indices.length,
        transparentIndices: transparentIndices.length,
        opaqueColors: this.colors.length,
        transparentColors: transparentColors.length,
        hasCSGMeshes: hasCSGMeshes
      });
    } catch {} }
  }

  /**
   * Render current obst geometry - separate opaque and transparent meshes
   */
  public render() {

    // Create opaque mesh
    if (this.mesh) { this.mesh.dispose(); }
    this.mesh = new BABYLON.Mesh("obstOpaque", this.babylonService.scene);

    if (this.vertices.length > 0) {
      // Compute normals only for standard obsts, preserve CSG mesh normals
      for (const range of this.standardObstRanges) {
        // Extract vertices and indices for this standard obst. Its indices were
        // appended as one contiguous block, so read that block directly instead
        // of scanning every index in the scene for each obst in turn.
        const obstVertices = this.vertices.slice(range.start, range.end);
        const obstIndices = [];

        for (let i = range.indexStart; i < range.indexEnd; i++) {
          obstIndices.push(this.indices[i] - range.vertexStart); // Make indices relative to this obst
        }


        // Compute normals for this standard obst
        const obstNormals = new Array(obstVertices.length).fill(0);
        BABYLON.VertexData.ComputeNormals(obstVertices, obstIndices, obstNormals);
        
        // Copy computed normals back to the main normals array
        for (let i = 0; i < obstNormals.length; i++) {
          this.normals[range.start + i] = obstNormals[i];
        }
      }
      
      // Assign data to opaque mesh
      this.vertexData = new BABYLON.VertexData();
      this.vertexData.positions = this.vertices;
      this.vertexData.indices = this.indices;
      this.vertexData.colors = this.colors;
      this.vertexData.normals = this.normals;
      this.vertexData.applyToMesh(this.mesh);

      // Opaque mesh never needs alpha blending
      this.babylonService.createShaderMaterial({ name: "opaqueShader", shader: "obst" })
        .then((material) => {
          this.material = material;
          this.material.setFloat("clipX", this.clipXNorm);
          this.material.setFloat("clipY", this.clipYNorm);
          this.material.setFloat("clipZ", this.clipZNorm);
          this.material.backFaceCulling = false;
          this.material.freeze();
          this.mesh.material = this.material;
        })
        .catch((e) => { if (isDevMode()) { try { console.error('[ObstService] Failed to create the opaque obst material', e); } catch {} } });

      this.mesh.enableEdgesRendering();
      this.mesh.edgesWidth = 0.05;
      this.mesh.edgesColor = new BABYLON.Color4(0.4, 0.4, 0.4, 1);
      this.mesh.freezeWorldMatrix();
    }

    // Create transparent mesh if needed
    const transparentVertices = (this as any).transparentVertices || [];
    const transparentColors = (this as any).transparentColors || [];
    const transparentIndices = (this as any).transparentIndices || [];

    if ((this as any)._meshTransparent) { (this as any)._meshTransparent.dispose(); }
    
    if (transparentVertices.length > 0) {
      (this as any)._meshTransparent = new BABYLON.Mesh("obstTransparent", this.babylonService.scene);
      
      if (isDevMode()) { try {
        console.debug('[ObstService] Creating transparent mesh with vertices:', transparentVertices.length);
      } catch {} }
      
      const transparentNormals = [];
      BABYLON.VertexData.ComputeNormals(transparentVertices, transparentIndices, transparentNormals);
      
      const transparentVertexData = new BABYLON.VertexData();
      transparentVertexData.positions = transparentVertices;
      transparentVertexData.indices = transparentIndices;
      transparentVertexData.colors = transparentColors;
      transparentVertexData.normals = transparentNormals;
      transparentVertexData.applyToMesh((this as any)._meshTransparent);

      this.babylonService.createShaderMaterial({ name: "transparentShader", shader: "obst", needAlphaBlending: true })
        .then((material) => {
          (this as any).materialTransparent = material;
          (this as any).materialTransparent.setFloat("clipX", this.clipXNorm);
          (this as any).materialTransparent.setFloat("clipY", this.clipYNorm);
          (this as any).materialTransparent.setFloat("clipZ", this.clipZNorm);
          (this as any).materialTransparent.backFaceCulling = false;
          (this as any).materialTransparent.freeze();
          (this as any)._meshTransparent.material = (this as any).materialTransparent;
        })
        .catch((e) => { if (isDevMode()) { try { console.error('[ObstService] Failed to create the transparent obst material', e); } catch {} } });

      (this as any)._meshTransparent.enableEdgesRendering();
      (this as any)._meshTransparent.edgesWidth = 0.05;
      (this as any)._meshTransparent.edgesColor = new BABYLON.Color4(0.4, 0.4, 0.4, 1);
      (this as any)._meshTransparent.freezeWorldMatrix();
    }

    // Create back cap mesh for opaque obsts (clipping visualization).
    // It is applied the same vertexData as the opaque mesh - geometry produced
    // by CSG hole cutting included - so obsts carrying a &HOLE get a cap too.
    if (this.meshBackCap) { this.meshBackCap.dispose(); }

    if (this.vertices.length > 0) {
      if (isDevMode()) console.log('[ObstService] Creating meshBackCap');
      this.meshBackCap = new BABYLON.Mesh("obstBackCapOpaque", this.babylonService.scene);
      this.vertexData.applyToMesh(this.meshBackCap);

      // Back-cap material for opaque mesh only
      this.babylonService.createShaderMaterial({ name: "opaqueBackCapShader", shader: "obstBackCap" })
        .then((material) => {
          this.materialBackCap = material;
          this.materialBackCap.setFloat("clipX", this.clipXNorm);
          this.materialBackCap.setFloat("clipY", this.clipYNorm);
          this.materialBackCap.setFloat("clipZ", this.clipZNorm);
          this.materialBackCap.zOffset = -0.01; // Always bring to front for clipping visualization
          this.materialBackCap.freeze();
          this.meshBackCap.material = this.materialBackCap;
        })
        .catch((e) => { if (isDevMode()) { try { console.error('[ObstService] Failed to create the obst back-cap material', e); } catch {} } });
      this.meshBackCap.freezeWorldMatrix();
    }
    
    // Put somewhere else ...
    this.babylonService.scene.freeActiveMeshes();

    // Uncomment when opacity - not working properly
    //this.mesh.material.needDepthPrePass = true;
    //this.mesh.mustDepthSortFacets = true;
    //this.babylonService.scene.registerBeforeRender(() => {
    //  this.mesh.updateFacetData();
    //});
  }

  /**
   * Enable or disable edges rendering for all obst meshes
   */
  public setEdgesRendering(enabled: boolean): void {
    // Control edges for opaque mesh
    if (this.mesh) {
      if (enabled) {
        this.mesh.enableEdgesRendering();
        this.mesh.edgesWidth = 0.05;
        this.mesh.edgesColor = new BABYLON.Color4(0.4, 0.4, 0.4, 1);
      } else {
        this.mesh.disableEdgesRendering();
        this.mesh.edgesWidth = 0; // Set to 0 for button logic
      }
    }

    // Control edges for transparent mesh
    if ((this as any)._meshTransparent) {
      if (enabled) {
        (this as any)._meshTransparent.enableEdgesRendering();
        (this as any)._meshTransparent.edgesWidth = 0.05;
        (this as any)._meshTransparent.edgesColor = new BABYLON.Color4(0.4, 0.4, 0.4, 1);
      } else {
        (this as any)._meshTransparent.disableEdgesRendering();
        (this as any)._meshTransparent.edgesWidth = 0; // Set to 0 for button logic
      }
    }
  }

  /**
   * Get transparent mesh for external access (e.g., for outline control)
   */
  public get meshTransparent(): BABYLON.Mesh | undefined {
    return (this as any)._meshTransparent;
  }

  /**
   * Select and highlight picked obst
   * @param ray ray from camera to pick point
   */
  public selectObst(ray: BABYLON.Ray) {

    // Find all intersecting triangles
    let intersectInfo = [];
    let faceId = -1;

    for (let i = 0; i < this.indices.length; i += 3) {
      faceId += 1;
      let p0 = this.positions[this.indices[i]];
      let p1 = this.positions[this.indices[i + 1]];
      let p2 = this.positions[this.indices[i + 2]];

      var currentIntersectInfo = ray.intersectsTriangle(p0, p1, p2);

      // Test if ray cross only visible triangles
      if (currentIntersectInfo
        &&
        (
          (p0.x >= this.clipXNorm &&
            p0.y >= this.clipYNorm &&
            p0.z <= this.clipZNorm)
          ||
          (p1.x >= this.clipXNorm &&
            p1.y >= this.clipYNorm &&
            p1.z <= this.clipZNorm)
          ||
          (p2.x >= this.clipXNorm &&
            p2.y >= this.clipYNorm &&
            p2.z <= this.clipZNorm)
        )
      ) {
        currentIntersectInfo.faceId = faceId;
        intersectInfo.push(currentIntersectInfo);
      }
    }

    if (intersectInfo.length > 0) {
      // Find clicked obst - sort triangles by distance
      intersectInfo = sortBy(intersectInfo, ['distance']);
      this.pickedObst = this.obsts[Math.floor(intersectInfo[0].faceId / 12)];

      // Draw temporary obst
      // Delete previous object
      if (this.pickedObstMesh) this.pickedObstMesh.dispose();

      // Create box
      let options = {
        width: this.pickedObst.vis.xbNorm.x2 - this.pickedObst.vis.xbNorm.x1,
        height: this.pickedObst.vis.xbNorm.y2 - this.pickedObst.vis.xbNorm.y1,
        depth: this.pickedObst.vis.xbNorm.z2 - this.pickedObst.vis.xbNorm.z1
      }
      this.pickedObstMesh = BABYLON.MeshBuilder.CreateBox("pickedObst", options, this.babylonService.scene);
      this.pickedObstMaterial = new BABYLON.StandardMaterial("myMaterial", this.babylonService.scene);
      this.pickedObstMaterial.ambientColor = new BABYLON.Color3(1, 1, 1);
      this.pickedObstMaterial.alpha = 0.4;
      this.pickedObstMaterial.zOffset = -0.05;
      this.pickedObstMesh.material = this.pickedObstMaterial;
      this.pickedObstMesh.enableEdgesRendering();
      this.pickedObstMesh.edgesWidth = 0.1;
      this.pickedObstMesh.edgesColor = new BABYLON.Color4(0.09, 0.49, 0.99, 1);
      this.pickedObstMesh.position = new BABYLON.Vector3((this.pickedObst.vis.xbNorm.x1 + (this.pickedObst.vis.xbNorm.x2 - this.pickedObst.vis.xbNorm.x1) / 2), this.pickedObst.vis.xbNorm.y1 + ((this.pickedObst.vis.xbNorm.y2 - this.pickedObst.vis.xbNorm.y1) / 2), this.pickedObst.vis.xbNorm.z1 + ((this.pickedObst.vis.xbNorm.z2 - this.pickedObst.vis.xbNorm.z1) / 2));

      if (isDevMode()) console.log(this.pickedObstMesh);
    }
  }

  /**
   * Assign holes to obsts based on spatial intersection
   */
  public assignHolesToObsts(): void {
    if (!this.holes || this.holes.length === 0) {
      return;
    }

    // Clear existing holes from all obsts
    this.obsts.forEach(obst => {
      obst.holes = [];
    });

    // Assign holes to obsts based on intersection
    this.holes.forEach(hole => {
      this.obsts.forEach(obst => {
        if (this.holeService.holeIntersectsObst(hole, obst)) {
          if (!obst.holes) {
            obst.holes = [];
          }
          obst.holes.push(hole);
        }
      });
    });
  }

  /**
   * Normalize holes before assigning to obsts
   */
  private normalizeHoles(): void {
    if (!this.holes || this.holes.length === 0) {
      return;
    }

    // Check if we need to calculate our own bounds (if meshes haven't been processed)
    let shouldCalculateBounds = (this.helperService.normDelta === 1 && 
                                this.helperService.normXMin === 0 && 
                                this.helperService.normYMin === 0 && 
                                this.helperService.normZMin === 0);

    if (shouldCalculateBounds && this.obsts && this.obsts.length > 0) {
      // Calculate bounds from obsts only (holes should be within obsts)
      let xMin = this.obsts[0].xb.x1, yMin = this.obsts[0].xb.y1, zMin = this.obsts[0].xb.z1;
      let xMax = this.obsts[0].xb.x2, yMax = this.obsts[0].xb.y2, zMax = this.obsts[0].xb.z2;
      
      if (this.obsts.length > 1) {
        forEach(this.obsts, (obst: IObst) => {
          const xb = obst.xb;
          xMin = xb.x1 < xMin ? xb.x1 : xMin;
          xMax = xb.x2 > xMax ? xb.x2 : xMax;
          yMin = xb.y1 < yMin ? xb.y1 : yMin;
          yMax = xb.y2 > yMax ? xb.y2 : yMax;
          zMin = xb.z1 < zMin ? xb.z1 : zMin;
          zMax = xb.z2 > zMax ? xb.z2 : zMax;
        });
      }

      // Update helper service with bounds
      this.helperService.normXMin = xMin;
      this.helperService.normYMin = yMin;
      this.helperService.normZMin = zMin;

      let deltaX = xMax - xMin;
      let deltaY = yMax - yMin;
      let deltaZ = zMax - zMin;
      this.helperService.normDelta = max([deltaX, deltaY, deltaZ]);

      // Calculate normalized maximum values
      let normXMax = ((xMax + (xMin < 0 ? -xMin : xMin)) / this.helperService.normDelta);
      let normYMax = ((yMax + (yMin < 0 ? -yMin : yMin)) / this.helperService.normDelta);
      let normZMax = ((zMax + (zMin < 0 ? -zMin : zMin)) / this.helperService.normDelta);

      this.helperService.normXMax = normXMax;
      this.helperService.normYMax = normYMax;
      this.helperService.normZMax = normZMax;
    }

    let delta = this.helperService.normDelta;
    let xMin = this.helperService.normXMin;
    let yMin = this.helperService.normYMin;
    let zMin = this.helperService.normZMin;

    // Normalize holes
    forEach(this.holes, (hole: IHole) => {
      if (!hole.vis) {
        hole.vis = { 
          xbNorm: { x1: 0, x2: 0, y1: 0, y2: 0, z1: 0, z2: 0 },
          colorNorm: [1, 1, 1, 1] // Default white color for holes
        };
      }
      
      // Normalize hole xb coordinates
      let holeXb = cloneDeep(hole.xb);
      forEach(holeXb, (o, key) => {
        holeXb[key] = toNumber(o);
      });

      holeXb.x1 += (xMin < 0) ? -xMin : xMin;
      hole.vis.xbNorm.x1 = holeXb.x1 / delta;

      holeXb.x2 += (xMin < 0) ? -xMin : xMin;
      hole.vis.xbNorm.x2 = holeXb.x2 / delta;

      holeXb.y1 += (yMin < 0) ? -yMin : yMin;
      hole.vis.xbNorm.y1 = holeXb.y1 / delta;
      holeXb.y2 += (yMin < 0) ? -yMin : yMin;
      hole.vis.xbNorm.y2 = holeXb.y2 / delta;

      holeXb.z1 += (zMin < 0) ? -zMin : zMin;
      hole.vis.xbNorm.z1 = holeXb.z1 / delta;
      holeXb.z2 += (zMin < 0) ? -zMin : zMin;
      hole.vis.xbNorm.z2 = holeXb.z2 / delta;
    });
  }

}
