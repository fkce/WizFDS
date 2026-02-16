import { Injectable } from '@angular/core';
import * as BABYLON from 'babylonjs';

import { BabylonService } from '../../babylon/babylon.service';
import { HelpersService } from '../../helpers/helpers.service';
import { VentService } from '../vent/vent.service';
import { IJetFan, IVent, IXb } from '../interfaces';

@Injectable({
  providedIn: 'root'
})
export class JetfanService {

  // Babylon.js objects
  public jetfans: IJetFan[] = [];
  public mesh: BABYLON.Mesh;
  private _meshTransparent: BABYLON.Mesh;
  public material: BABYLON.ShaderMaterial;
  public materialTransparent: BABYLON.ShaderMaterial;

  // Flow arrows
  public arrowMeshes: BABYLON.Mesh[] = [];
  public arrowMaterial: BABYLON.ShaderMaterial;

  // Clipping
  public clipX: number = 0;
  public clipY: number = 0;
  public clipZ: number = 0;

  constructor(
    private babylonService: BabylonService,
    private helpersService: HelpersService,
    private ventService: VentService
  ) { }

  /**
   * Generate vent_in and vent_out from jetfan definition
   */
  private generateVentsFromJetfan(jetfan: IJetFan): { vent_in: IVent, vent_out: IVent } {
    // Use normalized jetfan coordinates
    const xbNorm = jetfan.vis.xbNorm;
    
    // Create vent_in and vent_out XB based on direction (in normalized space)
    let ventInXbNorm: IXb, ventOutXbNorm: IXb;
    
    switch (jetfan.direction) {
      case '+x':
        ventInXbNorm = { ...xbNorm, x2: xbNorm.x1 }; // Left face
        ventOutXbNorm = { ...xbNorm, x1: xbNorm.x2 }; // Right face
        break;
      case '-x':
        ventInXbNorm = { ...xbNorm, x1: xbNorm.x2 }; // Right face
        ventOutXbNorm = { ...xbNorm, x2: xbNorm.x1 }; // Left face
        break;
      case '+y':
        ventInXbNorm = { ...xbNorm, y2: xbNorm.y1 }; // Front face
        ventOutXbNorm = { ...xbNorm, y1: xbNorm.y2 }; // Back face
        break;
      case '-y':
        ventInXbNorm = { ...xbNorm, y1: xbNorm.y2 }; // Back face
        ventOutXbNorm = { ...xbNorm, y2: xbNorm.y1 }; // Front face
        break;
      case '+z':
        ventInXbNorm = { ...xbNorm, z2: xbNorm.z1 }; // Bottom face
        ventOutXbNorm = { ...xbNorm, z1: xbNorm.z2 }; // Top face
        break;
      case '-z':
        ventInXbNorm = { ...xbNorm, z1: xbNorm.z2 }; // Top face
        ventOutXbNorm = { ...xbNorm, z2: xbNorm.z1 }; // Bottom face
        break;
      default:
        // Default to +x direction
        ventInXbNorm = { ...xbNorm, x2: xbNorm.x1 };
        ventOutXbNorm = { ...xbNorm, x1: xbNorm.x2 };
    }
    
    // Create vent_in (blue color)
    const vent_in: IVent = {
      id: jetfan.id + '_vent_in',
      uuid: jetfan.uuid + '_in',
      idAC: jetfan.idAC,
      xb: jetfan.xb, // Keep original coordinates for reference
      surf_id: 'HVAC',
      elevation: jetfan.elevation,
      color: {
        label: 'BLUE',
        value: 'BLUE',
        rgb: [0.0, 0.0, 1.0, 0.8], // Blue with some transparency
        show: true
      },
      vis: {
        xbNorm: ventInXbNorm, // Use normalized coordinates for rendering
        colorNorm: [0.0, 0.0, 1.0, 0.8]
      }
    };
    
    // Create vent_out (red color)
    const vent_out: IVent = {
      id: jetfan.id + '_vent_out',
      uuid: jetfan.uuid + '_out',
      idAC: jetfan.idAC,
      xb: jetfan.xb, // Keep original coordinates for reference
      surf_id: 'HVAC',
      elevation: jetfan.elevation,
      color: {
        label: 'RED',
        value: 'RED',
        rgb: [1.0, 0.0, 0.0, 0.8], // Red with some transparency
        show: true
      },
      vis: {
        xbNorm: ventOutXbNorm, // Use normalized coordinates for rendering
        colorNorm: [1.0, 0.0, 0.0, 0.8]
      }
    };
    
    return { vent_in, vent_out };
  }

  /**
   * Create flow arrow for vent_out
   */
  private createFlowArrow(jetfan: IJetFan): BABYLON.Mesh {
    // Calculate arrow position at the center of vent_out (use normalized coordinates)
    const xbNorm = jetfan.vent_out?.vis?.xbNorm || jetfan.vis.xbNorm;
    const centerX = (xbNorm.x1 + xbNorm.x2) / 2;
    const centerY = (xbNorm.y1 + xbNorm.y2) / 2;
    const centerZ = (xbNorm.z1 + xbNorm.z2) / 2;
    
    // Define arrow dimensions in real units (meters)
    const realArrowLength = 0.4; // 1 meter arrow length
    const realArrowRadius = 0.05;  // 0.1 meter arrow radius
    const realOffset = 0.2;       // 2 meter offset from vent
    
    // Convert to normalized scale using normDelta
    const arrowLength = realArrowLength / this.helpersService.normDelta;
    const arrowRadius = realArrowRadius / this.helpersService.normDelta;
    const offset = realOffset / this.helpersService.normDelta;
    
    // Create arrow shaft (cylinder)
    const shaft = BABYLON.MeshBuilder.CreateCylinder(
      `arrow_shaft_${jetfan.id}`,
      { height: arrowLength * 0.7, diameter: arrowRadius },
      this.babylonService.scene
    );
    
    // Create arrow head (cone)
    const head = BABYLON.MeshBuilder.CreateCylinder(
      `arrow_head_${jetfan.id}`,
      { height: arrowLength * 0.3, diameterTop: 0, diameterBottom: arrowRadius * 2 },
      this.babylonService.scene
    );
    
    // Position arrow head at the tip
    switch (jetfan.direction) {
      case '+x':
        shaft.rotation.z = -Math.PI / 2;
        head.rotation.z = -Math.PI / 2;
        head.position.x = arrowLength * 0.35;
        break;
      case '-x':
        shaft.rotation.z = Math.PI / 2;
        head.rotation.z = Math.PI / 2;
        head.position.x = -arrowLength * 0.35;
        break;
      case '+y':
        // Default orientation - no rotation needed (cylinder is already along Y axis)
        head.position.y = arrowLength * 0.35;
        break;
      case '-y':
        shaft.rotation.z = Math.PI;
        head.rotation.z = Math.PI;
        head.position.y = -arrowLength * 0.35;
        break;
      case '+z':
        shaft.rotation.x = -Math.PI / 2;
        head.rotation.x = Math.PI / 2;
        head.position.z = arrowLength * 0.35;
        break;
      case '-z':
        shaft.rotation.x = Math.PI / 2;
        head.rotation.x = -Math.PI / 2;
        head.position.z = -arrowLength * 0.35;
        break;
    }
    
    // Merge shaft and head into single mesh
    const arrow = BABYLON.Mesh.MergeMeshes([shaft, head], true, true, undefined, false, true);
    arrow.name = `flow_arrow_${jetfan.id}`;
    
    // Position arrow at vent_out center with offset
    arrow.position.set(centerX, centerY, centerZ);
    
    // Offset arrow outside the vent using normalized offset
    switch (jetfan.direction) {
      case '+x':
        arrow.position.x += offset;
        break;
      case '-x':
        arrow.position.x -= offset;
        break;
      case '+y':
        arrow.position.y += offset;
        break;
      case '-y':
        arrow.position.y -= offset;
        break;
      case '+z':
        arrow.position.z += offset;
        break;
      case '-z':
        arrow.position.z -= offset;
        break;
    }
    
    return arrow;
  }

  /**
   * Update jetfans vertex data (similar to obsts)
   */
  public updateJetfansVertexData() {
    let jetfansVertices: number[] = [];
    let jetfansIndices: number[] = [];
    let jetfansColors: number[] = [];
    let jetfansNormals: number[] = [];

    let jetfansVerticesTransparent: number[] = [];
    let jetfansIndicesTransparent: number[] = [];
    let jetfansColorsTransparent: number[] = [];
    let jetfansNormalsTransparent: number[] = [];

    let indexCount = 0;
    let indexCountTransparent = 0;

    this.jetfans.forEach((jetfan) => {
      if (jetfan.vis && jetfan.vis.colorNorm && jetfan.vis.xbNorm) {
        
        // Determine if jetfan is transparent
        const alpha = jetfan.transparency;
        const isTransparent = alpha < 1.0;

        // Use normalized coordinates for vertex data (like obsts)
        const xbNorm = jetfan.vis.xbNorm;
        
        // Choose appropriate arrays
        const vertices = isTransparent ? jetfansVerticesTransparent : jetfansVertices;
        const indices = isTransparent ? jetfansIndicesTransparent : jetfansIndices;
        const colors = isTransparent ? jetfansColorsTransparent : jetfansColors;
        const normals = isTransparent ? jetfansNormalsTransparent : jetfansNormals;
        const currentIndexCount = isTransparent ? indexCountTransparent : indexCount;

        // Generate jetfan geometry (box like obst) - using exact same pattern as obst service
        if (isTransparent) {
          // Add to transparent mesh (same as obst service)
          vertices.push(...this.helpersService.getVerticesFromXb(jetfan.vis.xbNorm));
          colors.push(...this.helpersService.getColors(jetfan.vis.colorNorm));
          indices.push(...this.helpersService.getIndices(indexCountTransparent));
          indexCountTransparent++;
        } else {
          // Add to opaque mesh (same as obst service)
          vertices.push(...this.helpersService.getVerticesFromXb(jetfan.vis.xbNorm));
          colors.push(...this.helpersService.getColors(jetfan.vis.colorNorm));
          indices.push(...this.helpersService.getIndices(indexCount));
          indexCount++;
        }
      }
    });

    // Store vertex data for both opaque and transparent jetfans
    return {
      opaque: {
        vertices: jetfansVertices,
        indices: jetfansIndices,
        colors: jetfansColors,
        normals: jetfansNormals
      },
      transparent: {
        vertices: jetfansVerticesTransparent,
        indices: jetfansIndicesTransparent,
        colors: jetfansColorsTransparent,
        normals: jetfansNormalsTransparent
      }
    };
  }

  /**
   * Render jetfans from WizFDS format
   */
  public renderJetfans(wizJetfans: any[]) {
    // Convert main app jetfans to library format
    this.jetfans = wizJetfans.map(jetfan => {
      // Convert Xb class to simple IXb interface
      let xbInterface = {
        x1: jetfan.xb.x1,
        x2: jetfan.xb.x2,
        y1: jetfan.xb.y1,
        y2: jetfan.xb.y2,
        z1: jetfan.xb.z1,
        z2: jetfan.xb.z2
      };
      
      // Check if jetfan has zero dimensions and use default size
      const hasZeroDimensions = (xbInterface.x1 === xbInterface.x2 && 
                               xbInterface.y1 === xbInterface.y2 && 
                               xbInterface.z1 === xbInterface.z2 && 
                               xbInterface.x1 === 0);
      
      if (hasZeroDimensions) {
        // Use default jetfan dimensions
        xbInterface = {
          x1: 2.0,
          x2: 8.0,
          y1: 3.0,
          y2: 5.0,
          z1: 1.0,
          z2: 3.0
        };
      }
      
      return {
        id: jetfan.id,
        uuid: jetfan.uuid,
        idAC: jetfan.idAC,
        xb: xbInterface,
        surf: jetfan.surf || 'INERT',
        elevation: jetfan.elevation,
        direction: jetfan.direction,
        color: jetfan.color,
        transparency: jetfan.transparency || 0.5,
        vis: {
          xbNorm: { x1: 0, x2: 0, y1: 0, y2: 0, z1: 0, z2: 0 }, // Will be normalized
          colorNorm: jetfan.color ? jetfan.color.rgb.concat([1]) : [1, 0, 0, 1]
        },
        flow: jetfan.flow,
        vent_in: null,  // Will be generated by service
        vent_out: null  // Will be generated by service
      };
    });
    
    this.render();
  }

  /**
   * Render jetfans with their vents and flow arrows
   */
  public async render() {
    // First normalize jetfans like other objects
    this.normalizeJetfans();

    // Generate vents for each jetfan
    let allVents: IVent[] = [];
    
    this.jetfans.forEach((jetfan) => {
      const vents = this.generateVentsFromJetfan(jetfan);
      jetfan.vent_in = vents.vent_in;
      jetfan.vent_out = vents.vent_out;
      
      allVents.push(vents.vent_in, vents.vent_out);
    });

    // Add generated vents to vent service
    this.ventService.vents = allVents;
    await this.ventService.render();

    // Get vertex data for jetfan boxes
    const jetfanData = this.updateJetfansVertexData();

    // Dispose existing meshes
    if (this.mesh) {
      this.mesh.dispose();
      this.mesh = null;
    }
    if (this._meshTransparent) {
      this._meshTransparent.dispose();
      this._meshTransparent = null;
    }

    // Dispose existing arrows
    this.arrowMeshes.forEach(arrow => arrow.dispose());
    this.arrowMeshes = [];

    // Load shader sources for jetfan boxes (reuse obst shaders)
    const sources = await this.babylonService.loadShaderSources('obst');
    const isWGSL = sources.shaderLanguage === ((BABYLON as any).ShaderLanguage?.WGSL ?? 1);
    const uniformsList = isWGSL ? ["clipX", "clipY", "clipZ"] : ["world", "worldView", "worldViewProjection", "view", "projection", "clipX", "clipY", "clipZ"];

    // Create opaque jetfans mesh
    if (jetfanData.opaque.vertices.length > 0) {
      this.mesh = new BABYLON.Mesh('jetfans', this.babylonService.scene);
      
      // Compute normals for opaque mesh (same as obst service)
      const computedNormals: number[] = [];
      BABYLON.VertexData.ComputeNormals(jetfanData.opaque.vertices, jetfanData.opaque.indices, computedNormals);
      
      const vertexData = new BABYLON.VertexData();
      vertexData.positions = jetfanData.opaque.vertices;
      vertexData.indices = jetfanData.opaque.indices;
      vertexData.colors = jetfanData.opaque.colors;
      vertexData.normals = computedNormals; // Use computed normals
      
      vertexData.applyToMesh(this.mesh);
      
      // Create material for opaque jetfans
      this.material = new (BABYLON as any).ShaderMaterial(
        "jetfanShader",
        this.babylonService.scene,
        { vertexSource: sources.vertexSource, fragmentSource: sources.fragmentSource },
        {
          needAlphaBlending: false,
          attributes: ["position", "normal", "color"],
          uniforms: uniformsList,
          uniformBuffers: isWGSL ? ["Scene", "Mesh"] : [],
          shaderLanguage: sources.shaderLanguage,
          entryPoint: { vertex: 'main', fragment: 'main' }
        }
      );
      this.material.setFloat("clipX", -1.1);  // Default clipping values like obst service
      this.material.setFloat("clipY", -1.1);
      this.material.setFloat("clipZ", 1.1);
      this.material.backFaceCulling = false;
      this.material.freeze(); // Freeze material for performance like obst service
      
      this.mesh.material = this.material;
      
      // Enable edges rendering by default (consistent with obst service)
      this.mesh.enableEdgesRendering();
      this.mesh.edgesWidth = 0.05;
      this.mesh.edgesColor = new BABYLON.Color4(0.4, 0.4, 0.4, 1);
    }

    // Create transparent jetfans mesh
    if (jetfanData.transparent.vertices.length > 0) {
      this._meshTransparent = new BABYLON.Mesh('jetfansTransparent', this.babylonService.scene);
      
      // Compute normals for transparent mesh (same as obst service)
      const computedNormalsTransparent: number[] = [];
      BABYLON.VertexData.ComputeNormals(jetfanData.transparent.vertices, jetfanData.transparent.indices, computedNormalsTransparent);
      
      const vertexDataTransparent = new BABYLON.VertexData();
      vertexDataTransparent.positions = jetfanData.transparent.vertices;
      vertexDataTransparent.indices = jetfanData.transparent.indices;
      vertexDataTransparent.colors = jetfanData.transparent.colors;
      vertexDataTransparent.normals = computedNormalsTransparent; // Use computed normals
      
      vertexDataTransparent.applyToMesh(this._meshTransparent);
      
      // Create material for transparent jetfans
      this.materialTransparent = new (BABYLON as any).ShaderMaterial(
        "jetfanTransparentShader",
        this.babylonService.scene,
        { vertexSource: sources.vertexSource, fragmentSource: sources.fragmentSource },
        {
          needAlphaBlending: true,
          attributes: ["position", "normal", "color"],
          uniforms: uniformsList,
          uniformBuffers: isWGSL ? ["Scene", "Mesh"] : [],
          shaderLanguage: sources.shaderLanguage,
          entryPoint: { vertex: 'main', fragment: 'main' }
        }
      );
      this.materialTransparent.setFloat("clipX", -1.1);  // Default clipping values like obst service
      this.materialTransparent.setFloat("clipY", -1.1);
      this.materialTransparent.setFloat("clipZ", 1.1);
      this.materialTransparent.backFaceCulling = false;
      this.materialTransparent.freeze(); // Freeze material for performance like obst service
      
      this._meshTransparent.material = this.materialTransparent;
      
      // Enable edges rendering by default for transparent mesh too
      this._meshTransparent.enableEdgesRendering();
      this._meshTransparent.edgesWidth = 0.05;
      this._meshTransparent.edgesColor = new BABYLON.Color4(0.4, 0.4, 0.4, 1);
    }

    // Create flow arrows for each jetfan
    const arrowSources = await this.babylonService.loadShaderSources('arrow');
    const arrowUniformsList = isWGSL ? [] : ["world", "worldView", "worldViewProjection", "view", "projection"];

    this.arrowMaterial = new (BABYLON as any).ShaderMaterial(
      "arrowShader",
      this.babylonService.scene,
      { vertexSource: arrowSources.vertexSource, fragmentSource: arrowSources.fragmentSource },
      {
        needAlphaBlending: false,
        attributes: ["position", "normal"],
        uniforms: arrowUniformsList,
        uniformBuffers: isWGSL ? ["Scene", "Mesh"] : [],
        shaderLanguage: arrowSources.shaderLanguage,
        entryPoint: { vertex: 'main', fragment: 'main' }
      }
    );

    this.jetfans.forEach((jetfan) => {
      const arrow = this.createFlowArrow(jetfan);
      arrow.material = this.arrowMaterial;
      this.arrowMeshes.push(arrow);
    });
  }

  /**
   * Set edges rendering for jetfans (consistent with obst service)
   */
  public setEdgesRendering(enabled: boolean) {
    // Control edges for opaque mesh
    if (this.mesh) {
      if (enabled) {
        this.mesh.enableEdgesRendering();
        this.mesh.edgesWidth = 0.05;
        this.mesh.edgesColor = new BABYLON.Color4(0.4, 0.4, 0.4, 1);
      } else {
        this.mesh.disableEdgesRendering();
        this.mesh.edgesWidth = 0; // Set to 0 for button logic consistency
      }
    }
    
    // Control edges for transparent mesh
    if (this._meshTransparent) {
      if (enabled) {
        this._meshTransparent.enableEdgesRendering();
        this._meshTransparent.edgesWidth = 0.05;
        this._meshTransparent.edgesColor = new BABYLON.Color4(0.4, 0.4, 0.4, 1);
      } else {
        this._meshTransparent.disableEdgesRendering();
        this._meshTransparent.edgesWidth = 0; // Set to 0 for button logic consistency
      }
    }

    // Note: Vents (vent_in and vent_out) are handled separately by VentService
    // and should render unchanged as requested
  }

  /**
   * Apply clipping to jetfans and their vents
   */
  public clip() {
    if (this.material) {
      this.material.setFloat('clipX', this.clipX);
      this.material.setFloat('clipY', this.clipY);
      this.material.setFloat('clipZ', this.clipZ);
    }
    
    if (this.materialTransparent) {
      this.materialTransparent.setFloat('clipX', this.clipX);
      this.materialTransparent.setFloat('clipY', this.clipY);
      this.materialTransparent.setFloat('clipZ', this.clipZ);
    }

    // Apply clipping to vents as well
    this.ventService.clipX = this.clipX;
    this.ventService.clipY = this.clipY;
    this.ventService.clipZ = this.clipZ;
    this.ventService.clip();
  }

  /**
   * Normalize jetfans using the same system as obsts and meshes
   */
  private normalizeJetfans(): void {
    let delta = this.helpersService.normDelta;
    let xMin = this.helpersService.normXMin;
    let yMin = this.helpersService.normYMin;
    let zMin = this.helpersService.normZMin;

    // If normalization parameters are not set (default values), calculate them from jetfans
    if (delta === 1 && xMin === 0 && yMin === 0 && zMin === 0 && this.jetfans.length > 0) {
      // Find min/max values from jetfans
      let xMinLocal = this.jetfans[0].xb.x1;
      let xMaxLocal = this.jetfans[0].xb.x2;
      let yMinLocal = this.jetfans[0].xb.y1;
      let yMaxLocal = this.jetfans[0].xb.y2;
      let zMinLocal = this.jetfans[0].xb.z1;
      let zMaxLocal = this.jetfans[0].xb.z2;

      this.jetfans.forEach(jetfan => {
        xMinLocal = Math.min(xMinLocal, jetfan.xb.x1);
        xMaxLocal = Math.max(xMaxLocal, jetfan.xb.x2);
        yMinLocal = Math.min(yMinLocal, jetfan.xb.y1);
        yMaxLocal = Math.max(yMaxLocal, jetfan.xb.y2);
        zMinLocal = Math.min(zMinLocal, jetfan.xb.z1);
        zMaxLocal = Math.max(zMaxLocal, jetfan.xb.z2);
      });

      // Calculate deltas and set normalization parameters
      const deltaX = xMaxLocal - xMinLocal;
      const deltaY = yMaxLocal - yMinLocal;
      const deltaZ = zMaxLocal - zMinLocal;
      
      xMin = xMinLocal;
      yMin = yMinLocal;
      zMin = zMinLocal;
      delta = Math.max(deltaX, deltaY, deltaZ);

      // Update helpers service with calculated values
      this.helpersService.normXMin = xMin;
      this.helpersService.normYMin = yMin;
      this.helpersService.normZMin = zMin;
      this.helpersService.normDelta = delta;
    }

    this.jetfans.forEach((jetfan) => {
      // Ensure vis object exists
      if (!jetfan.vis) {
        jetfan.vis = { 
          xbNorm: { x1: 0, x2: 0, y1: 0, y2: 0, z1: 0, z2: 0 }, 
          colorNorm: [1, 0, 0, jetfan.transparency || 1] // Use jetfan transparency for alpha
        };
      }
      if (!jetfan.vis.xbNorm) {
        jetfan.vis.xbNorm = { x1: 0, x2: 0, y1: 0, y2: 0, z1: 0, z2: 0 };
      }
      if (!jetfan.vis.colorNorm) {
        jetfan.vis.colorNorm = [1, 0, 0, jetfan.transparency || 1]; // Use jetfan transparency for alpha
      }

      // Normalize jetfan colors (same as obst service) - convert from 0-255 to 0-1 range
      if (jetfan.color && jetfan.color.rgb) {
        const alpha = jetfan.transparency || 1.0;
        jetfan.vis.colorNorm = [
          jetfan.color.rgb[0] / 255, 
          jetfan.color.rgb[1] / 255, 
          jetfan.color.rgb[2] / 255,
          alpha
        ];
      }

      // Normalize jetfan xb
      const xb = { ...jetfan.xb };
      
      // Apply same normalization as obsts/meshes
      xb.x1 += (xMin < 0) ? -xMin : xMin;
      jetfan.vis.xbNorm.x1 = xb.x1 / delta;

      xb.x2 += (xMin < 0) ? -xMin : xMin;
      jetfan.vis.xbNorm.x2 = xb.x2 / delta;

      xb.y1 += (yMin < 0) ? -yMin : yMin;
      jetfan.vis.xbNorm.y1 = xb.y1 / delta;

      xb.y2 += (yMin < 0) ? -yMin : yMin;
      jetfan.vis.xbNorm.y2 = xb.y2 / delta;

      xb.z1 += (zMin < 0) ? -zMin : zMin;
      jetfan.vis.xbNorm.z1 = xb.z1 / delta;

      xb.z2 += (zMin < 0) ? -zMin : zMin;
      jetfan.vis.xbNorm.z2 = xb.z2 / delta;
    });
  }

  /**
   * Clear jetfans
   */
  public clear() {
    this.jetfans = [];
    if (this.mesh) {
      this.mesh.dispose();
      this.mesh = null;
    }
    if (this._meshTransparent) {
      this._meshTransparent.dispose();
      this._meshTransparent = null;
    }
    
    // Clear arrows
    this.arrowMeshes.forEach(arrow => arrow.dispose());
    this.arrowMeshes = [];
    
    // Clear vents
    this.ventService.clear();
  }

}
