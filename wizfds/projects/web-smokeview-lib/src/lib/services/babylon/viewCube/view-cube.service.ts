import { Injectable, isDevMode } from '@angular/core';
import { BabylonService } from '../babylon.service';
import * as BABYLON from 'babylonjs';
import { toNumber } from 'lodash';
import { SceneBoundsService } from '../../scene-bounds/scene-bounds.service';
import { SceneLifecycleService, SceneScoped } from '../scene-lifecycle.service';

/**
 * The layer the cube and its hit boxes live on.
 *
 * A bit outside the default mask, so the main camera - which keeps the default -
 * draws none of them, and the cube's own camera draws nothing else. That is what
 * lets the cube sit at the origin, one unit across, in the middle of a model that
 * may be hundreds of metres wide: the two never meet.
 *
 * It used to be hidden from the main view by standing a thousand units away
 * instead, every one of its twenty-eight parts carrying that offset. It only
 * worked while the whole scene was one unit across, and stopped once the scene
 * became metres 1:1 (ADR-0002).
 */
const VIEW_CUBE_LAYER = 0x10000000;

@Injectable({
  providedIn: 'root'
})
export class ViewCubeService implements SceneScoped {

  public cameraViewCube: BABYLON.ArcRotateCamera;
  public viewCube: BABYLON.Mesh;
  public materialViewCube: BABYLON.StandardMaterial;
  public viewCubeGround: BABYLON.Mesh;
  public materialViewCubeGround: BABYLON.StandardMaterial;

  public frontPlane: BABYLON.Mesh;
  public backPlane: BABYLON.Mesh;
  public rightPlane: BABYLON.Mesh;
  public leftPlane: BABYLON.Mesh;
  public topPlane: BABYLON.Mesh;
  public bottomPlane: BABYLON.Mesh;

  public rightTopFrontBox: BABYLON.Mesh;
  public leftTopFrontBox: BABYLON.Mesh;
  public rightTopBackBox: BABYLON.Mesh;
  public leftTopBackBox: BABYLON.Mesh;
  public rightBottomFrontBox: BABYLON.Mesh;
  public leftBottomFrontBox: BABYLON.Mesh;
  public rightBottomBackBox: BABYLON.Mesh;
  public leftBottomBackBox: BABYLON.Mesh;

  public topFrontBox: BABYLON.Mesh;
  public topBackBox: BABYLON.Mesh;
  public topRightBox: BABYLON.Mesh;
  public topLeftBox: BABYLON.Mesh;
  public bottomFrontBox: BABYLON.Mesh;
  public bottomBackBox: BABYLON.Mesh;
  public bottomRightBox: BABYLON.Mesh;
  public bottomLeftBox: BABYLON.Mesh;

  public frontRightBox: BABYLON.Mesh;
  public frontLeftBox: BABYLON.Mesh;
  public backRightBox: BABYLON.Mesh;
  public backLeftBox: BABYLON.Mesh;

  constructor(
    private babylonService: BabylonService,
    private sceneBounds: SceneBoundsService,
    sceneLifecycle: SceneLifecycleService
  ) {
    sceneLifecycle.register(this);
  }

  /**
   * Release the cube, its ground, all 26 hit boxes, the materials and the
   * second camera - every one of them built in init() against the scene that
   * has just been disposed.
   *
   * Cleared by type rather than by name: naming thirty-odd fields would be a
   * list the next added face or box silently drops out of, which is the bug
   * this method exists to prevent.
   */
  public resetSceneState(): void {
    Object.keys(this).forEach(key => {
      const value = (this as any)[key];
      if (value instanceof BABYLON.Node || value instanceof BABYLON.Material) {
        (this as any)[key] = undefined;
      }
    });
  }

  /**
   * Create procedural texture for ViewCube with text labels
   */
  private createViewCubeProceduralTexture(): BABYLON.DynamicTexture {
    // This method now creates a simple texture - we'll use MultiMaterial approach
    const textureSize = 512;
    const dynamicTexture = new BABYLON.DynamicTexture("viewCubeTexture", {width: textureSize, height: textureSize}, this.babylonService.scene);
    
    const ctx = dynamicTexture.getContext() as any;
    ctx.fillStyle = "#F5F5F5";
    ctx.fillRect(0, 0, textureSize, textureSize);
    
    dynamicTexture.update();
    return dynamicTexture;
  }

  /**
   * Create individual face texture with proper orientation
   */
  private createFaceTexture(label: string, rotation: number = 0): BABYLON.DynamicTexture {
    const textureSize = 512;
    const dynamicTexture = new BABYLON.DynamicTexture(`viewCube_${label}`, {width: textureSize, height: textureSize}, this.babylonService.scene);
    
    const ctx = dynamicTexture.getContext() as any;
    
    // Clear with light background
    ctx.fillStyle = "#F5F5F5";
    ctx.fillRect(0, 0, textureSize, textureSize);
    
    // Draw text with proper orientation
    const fontSize = 92;
    const font = `bold ${fontSize}px Arial`;
    ctx.font = font;
    ctx.fillStyle = "#222222";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    
    // Save context for transformations
    ctx.save();
    
    // Move to center for transformations
    ctx.translate(textureSize / 2, textureSize / 2);
    
    // Apply horizontal flip to fix mirrored text
    ctx.scale(-1, 1);
    
    // Apply specific rotation for this face
    if (rotation !== 0) {
      ctx.rotate(rotation);
    }
    
    // Draw text at origin
    ctx.fillText(label, 0, 0);
    
    // Restore context
    ctx.restore();
    
    // Add border for debugging
    ctx.strokeStyle = "#CCCCCC";
    ctx.lineWidth = 2;
    ctx.strokeRect(0, 0, textureSize, textureSize);
    
    dynamicTexture.update();
    return dynamicTexture;
  }

  /**
   * Create procedural texture for ViewCube ground with circular pattern
   */
  private createViewCubeGroundProceduralTexture(): BABYLON.DynamicTexture {
    // Create a dynamic texture for the ground
    const textureSize = 256;
    const dynamicTexture = new BABYLON.DynamicTexture("viewCubeGroundTexture", {width: textureSize, height: textureSize}, this.babylonService.scene);
    
    // Get canvas context for custom drawing
    const canvas = dynamicTexture.getContext() as any;
    
    // Clear with transparent background
    canvas.clearRect(0, 0, textureSize, textureSize);
    
    // Create smoother radial gradient pattern
    const centerX = textureSize / 2;
    const centerY = textureSize / 2;
    const gradient = canvas.createRadialGradient(centerX, centerY, 0, centerX, centerY, textureSize / 2);
    
    // More gradual transition from center to edge
    gradient.addColorStop(0, 'rgba(80, 80, 80, 0.6)');     // Dark center
    gradient.addColorStop(0.3, 'rgba(120, 120, 120, 0.4)'); // Mid-dark
    gradient.addColorStop(0.6, 'rgba(160, 160, 160, 0.2)'); // Light
    gradient.addColorStop(0.8, 'rgba(180, 180, 180, 0.1)'); // Very light
    gradient.addColorStop(1, 'rgba(200, 200, 200, 0.0)');   // Fully transparent edge
    
    // Fill with gradient
    canvas.fillStyle = gradient;
    canvas.fillRect(0, 0, textureSize, textureSize);
    
    // Update the texture
    dynamicTexture.update();
    
    return dynamicTexture;
  }

  /**
   * Main method creating viewcube
   */
  public init() {

    this.createViewCube();

    this.createFrontPlane();
    this.createBackPlane();
    this.createRightPlane();
    this.createLeftPlane();
    this.createTopPlane();
    this.createBottomPlane();

    this.createRightTopFrontBox();
    this.createLeftTopFrontBox();
    this.createRightTopBackBox();
    this.createLeftTopBackBox();
    this.createRightBottomFrontBox();
    this.createLeftBottomFrontBox();
    this.createRightBottomBackBox();
    this.createLeftBottomBackBox();

    this.createTopFrontBox();
    this.createTopBackBox();
    this.createTopRightBox();
    this.createTopLeftBox();
    this.createBottomFrontBox();
    this.createBottomBackBox();
    this.createBottomRightBox();
    this.createBottomLeftBox();

    this.createFrontRightBox();
    this.createFrontLeftBox();
    this.createBackRightBox();
    this.createBackLeftBox();

    this.isolateOnOwnLayer();
  }

  /**
   * Put everything this service built on its own rendering layer, and make it
   * answer to picks.
   *
   * Assigned by type rather than by name, for the same reason resetSceneState()
   * is: naming thirty-odd meshes would be a list the next added face or box
   * silently drops out of - and one missing entry is a box floating in the middle
   * of the model.
   *
   * Pickability is said outright because the scene no longer defaults to it:
   * tuneForStaticScene() runs before the cube is built, and the Intermediate
   * performance priority means every mesh created after it is born with
   * isPickable = false. The cube relied on the old default, and every click
   * on it fell straight through.
   */
  private isolateOnOwnLayer(): void {
    Object.keys(this).forEach(key => {
      const value = (this as any)[key];
      if (value instanceof BABYLON.AbstractMesh) {
        value.layerMask = VIEW_CUBE_LAYER;
        // The ground opted out in createViewCube() and stays out
        if (value !== this.viewCubeGround) { value.isPickable = true; }
      }
    });
    this.cameraViewCube.layerMask = VIEW_CUBE_LAYER;
  }

  /**
   * Create view cube
   */
  private createViewCube() {

    // Create MultiMaterial for different faces
    const multiMaterial = new BABYLON.MultiMaterial("viewCubeMultiMaterial", this.babylonService.scene);
    
    // Create individual materials for each face with proper labels and orientations
    // Actual BabylonJS box face order with corrected rotations:
    const faceData = [
      { label: "TOP", rotation: Math.PI },            // Face 0: Top (+180°)
      { label: "BOTTOM", rotation: -Math.PI },        // Face 1: Bottom (-180°)
      { label: "RIGHT", rotation: Math.PI },          // Face 2: Right (+180°)
      { label: "LEFT", rotation: 0 },                 // Face 3: Left (no rotation)
      { label: "BACK", rotation: -Math.PI / 2 },      // Face 4: Back (-90°)
      { label: "FRONT", rotation: -Math.PI / 2 }      // Face 5: Front (-90°)
    ];

    // Create materials for each face
    for (let i = 0; i < 6; i++) {
      const material = new BABYLON.StandardMaterial(`viewCubeFace_${i}`, this.babylonService.scene);
      const texture = this.createFaceTexture(faceData[i].label, faceData[i].rotation);
      
      material.diffuseTexture = texture;
      material.emissiveTexture = texture;
      material.emissiveColor = new BABYLON.Color3(0.3, 0.3, 0.3);
      material.specularColor = BABYLON.Color3.Black();
      
      multiMaterial.subMaterials.push(material);
    }

    // Create mesh with MultiMaterial
    let options = {
      width: 1,
      height: 1,
      depth: 1
    };

    this.viewCube = BABYLON.MeshBuilder.CreateBox("viewBox", options, this.babylonService.scene);
    this.viewCube.position.y = 0;
    this.viewCube.material = multiMaterial;
    
    // Manually set up subMeshes for each face
    this.viewCube.subMeshes = [];
    const verticesCount = this.viewCube.getTotalVertices();
    
    // Each face of a box has 4 vertices, 2 triangles = 6 indices
    // Total: 6 faces * 6 indices = 36 indices
    for (let i = 0; i < 6; i++) {
      new BABYLON.SubMesh(i, 0, verticesCount, i * 6, 6, this.viewCube);
    }
    
    this.viewCube.enableEdgesRendering();
    this.viewCube.edgesWidth = 3;
    this.viewCube.edgesColor = BABYLON.Color4.FromInts(10, 10, 10, 255);

    // Ground - using StandardMaterial with procedural texture
    this.materialViewCubeGround = new BABYLON.StandardMaterial("materialViewCubeGround", this.babylonService.scene);
    
    if (isDevMode()) console.log("Creating procedural ViewCube ground texture for WebGPU compatibility");
    var textureGround = this.createViewCubeGroundProceduralTexture();
    
    this.materialViewCubeGround.diffuseTexture = textureGround;
    this.materialViewCubeGround.opacityTexture = textureGround;
    this.materialViewCubeGround.emissiveTexture = textureGround;
    this.materialViewCubeGround.emissiveColor = new BABYLON.Color3(0.2, 0.2, 0.2);
    this.materialViewCubeGround.specularColor = BABYLON.Color3.Black();
    this.materialViewCubeGround.specularColor = BABYLON.Color3.Black();

    var frontUV = new BABYLON.Vector4(0, 0, 1, 1);

    var optionsGround = {
      width: 1.65,
      height: 1.65,
      forntUVs: frontUV
    };
    this.viewCubeGround = BABYLON.MeshBuilder.CreatePlane("ground", optionsGround, this.babylonService.scene);
    this.viewCubeGround.material = this.materialViewCubeGround;
    this.viewCubeGround.isPickable = false;
    this.viewCubeGround.position.y = 0;
    this.viewCubeGround.position.z = -0.6;
    this.viewCubeGround.rotation = new BABYLON.Vector3(0, Math.PI, 0);

    // CameraView
    this.cameraViewCube = new BABYLON.ArcRotateCamera("cameraView", 0, 0, 0.1, BABYLON.Vector3.Zero(), this.babylonService.scene);
    this.cameraViewCube.setPosition(new BABYLON.Vector3(0, 0, 2));
    // @ts-ignore
    this.cameraViewCube.target = this.viewCube;
    this.cameraViewCube.viewport = new BABYLON.Viewport(.85, .8, .2, .2);
    this.cameraViewCube.upVector = new BABYLON.Vector3(0, 0, 1);
    this.cameraViewCube.lowerRadiusLimit = 3;
    this.cameraViewCube.upperRadiusLimit = 3;

    // The cube's camera never hears the pointer. It used to, and turned in
    // lockstep with the model camera off the same canvas events - until one
    // of them hit a beta limit the other did not, and the two integrations
    // drifted apart for good. A mirror cannot drift: same up vector, same
    // angles, and the cube shows exactly the orientation the model is seen
    // from. Radius and target stay its own - it only frames the cube.
    this.babylonService.scene.onBeforeRenderObservable.add(() => {
      if (!this.cameraViewCube || !this.babylonService.camera) { return; }
      this.cameraViewCube.alpha = this.babylonService.camera.alpha;
      this.cameraViewCube.beta = this.babylonService.camera.beta;
    });

    this.babylonService.scene.activeCameras.push(this.cameraViewCube);
  }

  /**
   * Which face or corner of the cube is under the pointer, if any.
   *
   * Restricted to the cube's own layer, because scene.pick() does not honour
   * layer masks the way rendering does: the obst mesh would otherwise answer
   * first for most of the cube's corner of the screen - and it does, for any
   * scenario carrying an element at the FDS sentinel, whose box surrounds the
   * cube's camera on every side.
   */
  public pickSide(): string | null {
    const scene = this.babylonService.scene;
    if (!scene || !this.cameraViewCube) { return null; }

    const hit = scene.pick(scene.pointerX, scene.pointerY,
      (mesh: BABYLON.AbstractMesh) =>
        mesh.isPickable && mesh.isEnabled() && mesh.isVisible &&
        (mesh.layerMask & VIEW_CUBE_LAYER) !== 0,
      null, this.cameraViewCube);

    return (hit && hit.hit && hit.pickedMesh) ? hit.pickedMesh.name : null;
  }

  /**
   * Light the part of the cube a click would take, azure and half-glass.
   *
   * Driven by the component's pointer-move pick, not by Babylon's
   * ActionManager hover triggers: those need the whole scene picked on every
   * pointer move, which tuneForStaticScene() deliberately turned off. The
   * cube lights itself from the pick it already makes - see pickSide().
   *
   * @param side what pickSide() answered, or null for nothing under the
   *             pointer. The cube body and the ground are not parts - a name
   *             that is not a part just puts the light out.
   */
  public highlight(side: string | null): void {
    const scene = this.babylonService.scene;
    if (!scene) { return; }

    const mesh = side ? scene.getMeshByName(side) : null;
    const part = mesh
      && mesh !== this.viewCube && mesh !== this.viewCubeGround
      && (mesh.layerMask & VIEW_CUBE_LAYER) !== 0
      ? mesh : null;

    if (this.litPart === part) { return; }

    if (this.litPart && this.litPart.material) { this.litPart.material.alpha = 0.0; }
    if (part && part.material) { part.material.alpha = 0.5; }
    this.litPart = part;
  }

  /** The part currently lit, so the light moves instead of doubling. */
  private litPart: BABYLON.AbstractMesh | null = null;

  /**
   * Zoom to side
   */
  public zoomToSide(side: string) {
    // Set camera target to the center of obst mesh

    if (side == 'top') {
      this.animate(new BABYLON.Vector3(0, 0, 1));
    }
    else if (side == 'bottom') {
      this.animate(new BABYLON.Vector3(0, 0, -1));
    }
    else if (side == 'right') {
      this.animate(new BABYLON.Vector3(1, 0, 0));
    }
    else if (side == 'left') {
      this.animate(new BABYLON.Vector3(-1, 0, 0));
    }
    else if (side == 'back') {
      this.animate(new BABYLON.Vector3(0, 1, 0));
    }
    else if (side == 'front') {
      this.animate(new BABYLON.Vector3(0, -1, 0));
    }
    else if (side == 'leftTopFront') {
      this.animate(new BABYLON.Vector3(-1, -1, 1));
    }
    else if (side == 'rightTopFront') {
      this.animate(new BABYLON.Vector3(1, -1, 1));
    }
    else if (side == 'leftTopBack') {
      this.animate(new BABYLON.Vector3(-1, 1, 1));
    }
    else if (side == 'rightTopBack') {
      this.animate(new BABYLON.Vector3(1, 1, 1));
    }
    else if (side == 'leftBottomFront') {
      this.animate(new BABYLON.Vector3(-1, -1, -1));
    }
    else if (side == 'rightBottomFront') {
      this.animate(new BABYLON.Vector3(1, -1, -1));
    }
    else if (side == 'leftBottomBack') {
      this.animate(new BABYLON.Vector3(-1, 1, -1));
    }
    else if (side == 'rightBottomBack') {
      this.animate(new BABYLON.Vector3(1, 1, -1));
    }
    else if (side == 'topFront') {
      this.animate(new BABYLON.Vector3(0, -1, 1));
    }
    else if (side == 'topBack') {
      this.animate(new BABYLON.Vector3(0, 1, 1));
    }
    else if (side == 'topRight') {
      this.animate(new BABYLON.Vector3(1, 0, 1));
    }
    else if (side == 'topLeft') {
      this.animate(new BABYLON.Vector3(-1, 0, 1));
    }
    else if (side == 'bottomFront') {
      this.animate(new BABYLON.Vector3(0, -1, -1));
    }
    else if (side == 'bottomBack') {
      this.animate(new BABYLON.Vector3(0, 1, -1));
    }
    else if (side == 'bottomRight') {
      this.animate(new BABYLON.Vector3(1, 0, -1));
    }
    else if (side == 'bottomLeft') {
      this.animate(new BABYLON.Vector3(-1, 0, -1));
    }
    else if (side == 'frontRight') {
      this.animate(new BABYLON.Vector3(1, -1, 0));
    }
    else if (side == 'frontLeft') {
      this.animate(new BABYLON.Vector3(-1, -1, 0));
    }
    else if (side == 'backRight') {
      this.animate(new BABYLON.Vector3(1, 1, 0));
    }
    else if (side == 'backLeft') {
      this.animate(new BABYLON.Vector3(-1, 1, 0));
    }
  }

  /**
   * Animate camera fly
   * @param cameraVector target position
   */
  public animate(cameraVector: BABYLON.Vector3) {

    // The model as it was measured, not the bounding sphere of the obst mesh:
    // one element left at the FDS sentinel would otherwise decide where the
    // camera flies to, and it is drawn but deliberately not measured (ADR-0002).
    const modelCenter = this.sceneBounds.center;
    const center = new BABYLON.Vector3(modelCenter.x, modelCenter.y, modelCenter.z);

    // The direction is a unit-ish vector, so how far along it the camera stands
    // has to come from the model
    const reach = this.babylonService.radiusToFit();
    let vector = new BABYLON.Vector3(center.x + cameraVector.x * reach, center.y + cameraVector.y * reach, center.z + cameraVector.z * reach);

    var cameraPosition = new BABYLON.Animation("animCameraPostion", "position", 30, BABYLON.Animation.ANIMATIONTYPE_VECTOR3, BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT);
    var cameraRadius = new BABYLON.Animation("animCameraRadius", "radius", 30, BABYLON.Animation.ANIMATIONTYPE_FLOAT, BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT);
    var cameraAlpha = new BABYLON.Animation("animCameraAlpha", "alpha", 30, BABYLON.Animation.ANIMATIONTYPE_FLOAT, BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT);
    var cameraTarget = new BABYLON.Animation("animCameraTarget", "target", 30, BABYLON.Animation.ANIMATIONTYPE_VECTOR3, BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT);

    var cameraPositionKeys = [];
    var cameraRadiusKeys = [];
    var cameraAlphaKeys = [];
    var cameraTargetKeys = [];
    cameraPositionKeys.push({ frame: 0, value: this.babylonService.camera.position.clone() }, { frame: 15, value: vector });
    cameraRadiusKeys = [{ frame: 0, value: this.babylonService.camera.radius }, { frame: 15, value: this.getRadius() }];
    cameraAlphaKeys = [{ frame: 0, value: this.babylonService.camera.alpha }, { frame: 15, value: this.getAlpha(this.babylonService.camera.alpha, cameraVector) }];
    cameraTargetKeys.push({ frame: 0, value: this.babylonService.camera.target.clone() }, { frame: 15, value: center });

    cameraPosition.setKeys(cameraPositionKeys);
    cameraRadius.setKeys(cameraRadiusKeys);
    cameraAlpha.setKeys(cameraAlphaKeys);
    cameraTarget.setKeys(cameraTargetKeys);

    // Only the model camera flies; the cube's camera mirrors its angles every
    // frame (see createViewCube), so animating it separately would just fight
    // the mirror - it used to, and each flight was a chance to drift.
    this.babylonService.camera.animations = [];
    this.babylonService.camera.animations.push(cameraPosition);
    this.babylonService.camera.animations.push(cameraRadius);
    this.babylonService.camera.animations.push(cameraAlpha);
    this.babylonService.camera.animations.push(cameraTarget);

    this.babylonService.scene.beginAnimation(this.babylonService.camera, 0, 15, false, 1);
  }

  /**
   * Get the closest alpha after clicking target point
   * @param currentAlpha current camera alpha
   * @param vector target point
   */
  private getAlpha(currentAlpha: number, vector: BABYLON.Vector3): number {

    // Find current position value
    let currentIntegerPart = 0;
    let currentDecimalPart = (currentAlpha / Math.PI) % 1;
    let currentPositionValue = 0.0;
    if (currentAlpha >= 0) {
      currentIntegerPart = Math.floor((currentAlpha / Math.PI));
      currentPositionValue = currentIntegerPart % 2 == 0 ? currentDecimalPart : currentDecimalPart + 1;
    }
    else {
      currentIntegerPart = Math.ceil((currentAlpha / Math.PI));
      currentPositionValue = currentIntegerPart % 2 == 0 ? currentDecimalPart : currentDecimalPart - 1;
    }

    // When clicking sides
    if (vector.x == 1 && vector.y == 0) {
      let targetPositionValue;

      // Current alpha positive values
      //                        c=1.75
      //            x---------x
      //            |    b    |
      //            | l -|- r | t=0.00 | 2.00
      //            |    f    |  
      //            x---------x 
      //                        c=0.25
      if (currentAlpha >= 0) {
        targetPositionValue = 0.00;

        // If current postion in <0, 1) interval (rotate counter clockwise)
        if (currentPositionValue >= 0 && currentPositionValue < 1) {
          return (currentIntegerPart + targetPositionValue) * Math.PI;
        }
        // If current posiotion in <1, 2) interval (rotate clockwise) - to opposite corner
        else if (currentPositionValue >= 1 && currentPositionValue < 2) {
          return (currentIntegerPart + 1 + targetPositionValue) * Math.PI;
        }
      }
      // Current alpha negative values
      //                        c=-0.25
      //            x---------x
      //            |    b    |
      //            | l -|- r | t=0.00 | -2.00
      //            |    f    |  
      //            x---------x 
      //                        c=-1.75
      else {
        targetPositionValue = 0.00;

        // If current position in (-1, 0> interval (rotate clockwise)
        if (currentPositionValue > -1 && currentPositionValue <= 0) {
          // example: -2 + 0 = -2
          // example: 0 + 0 = 0
          return (currentIntegerPart + targetPositionValue) * Math.PI;
        }
        // if current position in <-1, -2) interval (rotate counter clockwise)
        else if (currentPositionValue <= -1 && currentPositionValue > -2) {
          // example: -1 - 1 + 0 = -2
          return (currentIntegerPart - 1 + targetPositionValue) * Math.PI;
        }
      }
    }
    else if (vector.x == 1 && vector.y == -1) {
      let targetPositionValue;

      // Current alpha positive values
      //                        c=1.75
      //            x---------x
      //            |    b    |
      //            | l -|- r | c=0.00
      //            |    f    |  
      //            x---------x
      //     0.75=c             t=0.25
      //                 c=0.50
      if (currentAlpha >= 0) {
        targetPositionValue = 0.25;

        // If current position is lower than target <0, 0.25) (rotate clockwise)
        if (targetPositionValue - currentPositionValue > 0) {
          return (currentIntegerPart + targetPositionValue) * Math.PI;
        }
        // If current position is higher than target <0.25, 2)
        else {

          // If current postion in <0.25, 1) interval (rotate counter clockwise)
          if (currentPositionValue >= 0.25 && currentPositionValue < 1) {
            return (currentIntegerPart + targetPositionValue) * Math.PI;
          }
          // If current posiotion in <1, 1.25) interval (rotate counter clockwise) - to opposite corner
          else if (currentPositionValue >= 1 && currentPositionValue < 1.25) {
            return (currentIntegerPart - 1 + targetPositionValue) * Math.PI;
          }
          // If current posiotion in <1.25, 2.00) interval (rotate clockwise) - after opposite corner
          else if (currentPositionValue > 1.25 && currentPositionValue < 2) {
            return (currentIntegerPart + 1 + targetPositionValue) * Math.PI;
          }
        }
      }
      // Current alpha negative values
      //                        c=-0.75
      //            x---------x
      //            |    b    |
      //            | l -|- r | c=0.00
      //            |    f    |  
      //            x---------x
      //    -1.25=c             t=-1.75
      //                 c=-1.50
      else {
        targetPositionValue = -1.75;

        // If current posiotion is lower than target <-1.75, -2)
        if (targetPositionValue - currentPositionValue >= 0) {
          return (currentIntegerPart + 1 + targetPositionValue) * Math.PI;
        }
        // If current posiotion is higher thane target <0, -1.75)
        else {

          // If current position in (-0.75, 0> interval (rotate clockwise)
          if (currentPositionValue > -0.75 && currentPositionValue <= 0) {
            // example: -2 + 2 + targetPostion = -1.75
            // example: 0 + 2 + targetPostion = 0.25
            return (currentIntegerPart + 2 + targetPositionValue) * Math.PI;
          }
          // if current position in <-0.75, -1) interval (rotate counter clockwise)
          else if (currentPositionValue <= -0.75 && currentPositionValue > -1) {
            // example: 0 + targetPostion = -1.75
            return (currentIntegerPart + targetPositionValue) * Math.PI;
          }
          // If current position in <-1, -1.75) interval (rotate counter clockwise)
          else if (currentPositionValue <= -1 && currentPositionValue > -1.75) {
            return (currentIntegerPart + 1 + targetPositionValue) * Math.PI;
          }
        }
      }
    }
    else if (vector.x == 0 && vector.y == -1) {
      let targetPositionValue;

      // Current alpha positive values
      //                        
      //            x---------x
      //            |    b    |
      //            | l -|- r | 
      //            |    f    |  
      //            x---------x
      //                 t=0.50
      //          c=0.75        c=0.25
      //
      if (currentAlpha >= 0) {
        targetPositionValue = 0.50;

        // If current position is lower than target <0, 0.50) (rotate clockwise)
        if (targetPositionValue - currentPositionValue > 0) {
          return (currentIntegerPart + targetPositionValue) * Math.PI;
        }
        // If current position is higher than target <0.50, 2)
        else {

          // If current postion in <0.50, 1) interval (rotate counter clockwise)
          if (currentPositionValue >= 0.50 && currentPositionValue < 1) {
            return (currentIntegerPart + targetPositionValue) * Math.PI;
          }
          // If current posiotion in <1, 1.50) interval (rotate counter clockwise) - to opposite corner
          else if (currentPositionValue >= 1 && currentPositionValue < 1.50) {
            return (currentIntegerPart - 1 + targetPositionValue) * Math.PI;
          }
          // If current posiotion in <1.50, 2.00) interval (rotate clockwise) - after opposite corner
          else if (currentPositionValue > 1.50 && currentPositionValue < 2) {
            return (currentIntegerPart + 1 + targetPositionValue) * Math.PI;
          }
        }
      }
      // Current alpha negative values
      //                        
      //            x---------x
      //            |    b    |
      //            | l -|- r | 
      //            |    f    |  
      //            x---------x
      //                 t=-1.50
      //          c=-1.25       c=-1.75
      //
      else {
        targetPositionValue = -1.50;

        // If current posiotion is lower than target <-1.50, -2)
        if (targetPositionValue - currentPositionValue >= 0) {
          return (currentIntegerPart + 1 + targetPositionValue) * Math.PI;
        }
        // If current posiotion is higher thane target <0, -1.50)
        else {

          // If current position in (-0.50, 0> interval (rotate clockwise)
          if (currentPositionValue > -0.50 && currentPositionValue <= 0) {
            // example: -2 + 2 + targetPostion = -1.50
            // example: 0 + 2 + targetPostion = 0.50
            return (currentIntegerPart + 2 + targetPositionValue) * Math.PI;
          }
          // if current position in <-0.50, -1) interval (rotate counter clockwise)
          else if (currentPositionValue <= -0.50 && currentPositionValue > -1) {
            // example: 0 + targetPostion = -1.50
            return (currentIntegerPart + targetPositionValue) * Math.PI;
          }
          // If current position in <-1, -1.50) interval (rotate counter clockwise)
          else if (currentPositionValue <= -1 && currentPositionValue > -1.50) {
            return (currentIntegerPart + 1 + targetPositionValue) * Math.PI;
          }
        }
      }
    }
    else if (vector.x == -1 && vector.y == -1) {
      let targetPositionValue;

      // Current alpha positive values
      //     1.25=c              
      //            x---------x
      //            |    b    |
      //     1.00=c | l -|- r | 
      //            |    f    |  
      //            x---------x
      //     0.75=t             c=0.25
      //                 c=0.50
      if (currentAlpha >= 0) {
        targetPositionValue = 0.75;

        // If current position is lower than target <0, 0.75) (rotate clockwise)
        if (targetPositionValue - currentPositionValue > 0) {
          return (currentIntegerPart + targetPositionValue) * Math.PI;
        }
        // If current position is higher than target <0.75, 2)
        else {

          // If current postion in <0.75, 1) interval (rotate counter clockwise)
          if (currentPositionValue >= 0.75 && currentPositionValue < 1) {
            return (currentIntegerPart + targetPositionValue) * Math.PI;
          }
          // If current posiotion in <1, 1.75) interval (rotate counter clockwise) - to opposite corner
          else if (currentPositionValue >= 1 && currentPositionValue < 1.75) {
            return (currentIntegerPart - 1 + targetPositionValue) * Math.PI;
          }
          // If current posiotion in <1.75, 2.00) interval (rotate clockwise) - after opposite corner
          else if (currentPositionValue >= 1.75 && currentPositionValue < 2) {
            return (currentIntegerPart + 1 + targetPositionValue) * Math.PI;
          }
        }
      }
      // Current alpha negative values
      //    -0.75=c              
      //            x---------x
      //            |    b    |
      //    -1.00=c | l -|- r | 
      //            |    f    |  
      //            x---------x
      //    -1.25=t             c=-1.75
      //                 c=-1.50
      else {
        targetPositionValue = -1.25;

        // If current posiotion is lower than target <-1.25, -2)
        if (targetPositionValue - currentPositionValue >= 0) {
          return (currentIntegerPart + 1 + targetPositionValue) * Math.PI;
        }
        // If current posiotion is higher thane target <0, -1.25)
        else {

          // If current position in (-0.25, 0> interval (rotate clockwise)
          if (currentPositionValue > -0.25 && currentPositionValue <= 0) {
            // example: -2 + 2 + targetPostion = -1.75
            // example: 0 + 2 + targetPostion = 0.75
            return (currentIntegerPart + 2 + targetPositionValue) * Math.PI;
          }
          // if current position in <-0.25, -1) interval (rotate counter clockwise)
          else if (currentPositionValue <= -0.25 && currentPositionValue > -1) {
            // example: 0 + targetPostion = -1.75
            return (currentIntegerPart + targetPositionValue) * Math.PI;
          }
          // If current position in <-1, -1.25) interval (rotate counter clockwise)
          else if (currentPositionValue <= -1 && currentPositionValue > -1.25) {
            return (currentIntegerPart + 1 + targetPositionValue) * Math.PI;
          }
        }
      }
    }
    else if (vector.x == -1 && vector.y == 0) {
      let targetPositionValue;

      // Current alpha positive values
      //     1.25=c              
      //            x---------x
      //            |    b    |
      //     1.00=t | l -|- r | 
      //            |    f    |  
      //            x---------x
      //     0.75=c             c=0.25
      //                 c=0.5
      //            
      if (currentAlpha >= 0) {
        targetPositionValue = 1.00;

        // If current position is lower than target <0, 1) (rotate clockwise)
        if (targetPositionValue - currentPositionValue > 0) {
          return (currentIntegerPart + targetPositionValue) * Math.PI;
        }
        // If current position is higher than target <1, 2)
        else {
          // Example: 1 - 1 + 1 = 1
          return (currentIntegerPart - 1 + targetPositionValue) * Math.PI;
        }
      }
      // Current alpha negative values
      else {
        targetPositionValue = -1.00;

        // If current posiotion is lower than target <-1, -2)
        if (targetPositionValue - currentPositionValue >= 0) {
          return (currentIntegerPart + 1 + targetPositionValue) * Math.PI;
        }
        // If current position is higher thane target <0, -1)
        else {
          // Example: 0 + (-1) = -1
          return (currentIntegerPart + targetPositionValue) * Math.PI;
        }
      }
    }
    else if (vector.x == -1 && vector.y == 1) {
      let targetPositionValue;

      // Current alpha positive values
      //                 c=1.50
      //     1.25=t             c=1.75         
      //            x---------x
      //            |    b    |
      //     1.00=c | l -|- r | 
      //            |    f    |  
      //            x---------x
      //     0.75=c 
      //            
      if (currentAlpha >= 0) {
        targetPositionValue = 1.25;

        // If current position is lower than target <0, 1.25)
        if (targetPositionValue - currentPositionValue > 0) {
          // If current postion in <0, 0.25) interval (rotate counter clockwise)
          if (currentPositionValue >= 0 && currentPositionValue < 0.25) {
            // Example: 0 - 2 + 1.25 = -0.75
            // Example: 2 - 2 + 1.25 = 1.25
            return (currentIntegerPart - 2 + targetPositionValue) * Math.PI;
          }
          // If current postion in <0.25, 1.00) interval (rotate clockwise)
          else if (currentPositionValue >= 0.25 && currentPositionValue < 1) {
            // Example: 0 + 1.25 = 1.25
            return (currentIntegerPart + targetPositionValue) * Math.PI;
          }
          // If current Postion in <1, 1.25)
          else if (currentPositionValue >= 1 && currentPositionValue < 1.25) {
            // Example: 1 - 1 + 1.25 = 1.25
            return (currentIntegerPart - 1 + targetPositionValue) * Math.PI;
          }
        }
        // If current position is higher than target <1.25, 2) (always rotate counter clockwise)
        else {
          // Example: 1 - 1 + 1.25 = 1.25
          return (currentIntegerPart - 1 + targetPositionValue) * Math.PI;
        }
      }
      // Current alpha negative values
      //                 c=-0.50
      //    -0.75=t             c=-0.75         
      //            x---------x
      //            |    b    |
      //    -1.00=c | l -|- r | 
      //            |    f    |  
      //            x---------x
      //    -1.25=c 
      //            
      else {
        targetPositionValue = -0.75;

        // If current position is lower than target <-0.75, -2)
        if (targetPositionValue - currentPositionValue >= 0) {
          // If current position in <-0.75, -1)
          if (currentPositionValue <= -0.75 && currentPositionValue > -1) {
            // Example: 0 + (-0.75) = -0.75
            return (currentIntegerPart + targetPositionValue) * Math.PI;
          }
          // If current position in <-1, -1.75) (rotate clockwise)
          else if (currentPositionValue <= -1 && currentPositionValue > -1.75) {
            // Example: -1 + 1 + (-0.75) = -0.75
            return (currentIntegerPart + 1 + targetPositionValue) * Math.PI;
          }
          // If current position in <-1.75, -2) (rotate counter clockwise)
          else if (currentPositionValue <= -1.75 && currentPositionValue > -2) {
            // Example: -1 - 1 + (-0.75) = -2.75.
            return (currentIntegerPart - 1 + targetPositionValue) * Math.PI;
          }
        }
        // If current posiotion is higher thane target <0, -0.75)
        else {
          // Example: 0 + (-0.75) = -0.75
          return (currentIntegerPart + targetPositionValue) * Math.PI;
        }
      }
    }
    else if (vector.x == 0 && vector.y == 1) {
      let targetPositionValue;

      // Current alpha positive values
      //     1.25=c             c=1.75         
      //                 t=1.50
      //            x---------x
      //            |    b    |
      //            | l -|- r | 
      //            |    f    |  
      //            x---------x
      //            
      if (currentAlpha >= 0) {
        targetPositionValue = 1.50;

        // If current position is lower than target <0, 1.50)
        if (targetPositionValue - currentPositionValue > 0) {
          // If current postion in <0, 0.50) interval (rotate counter clockwise)
          if (currentPositionValue >= 0 && currentPositionValue < 0.50) {
            // Example: 0 - 2 + 1.50 = -0.50
            // Example: 2 - 2 + 1.50 = 1.50
            return (currentIntegerPart - 2 + targetPositionValue) * Math.PI;
          }
          // If current postion in <0.50, 1.00) interval (rotate clockwise)
          else if (currentPositionValue >= 0.50 && currentPositionValue < 1) {
            // Example: 0 + 1.50 = 1.50
            return (currentIntegerPart + targetPositionValue) * Math.PI;
          }
          // If current Postion in <1, 1.50)
          else if (currentPositionValue >= 1 && currentPositionValue < 1.25) {
            // Example: 1 - 1 + 1.50 = 1.50
            return (currentIntegerPart - 1 + targetPositionValue) * Math.PI;
          }
        }
        // If current position is higher than target <1.50, 2) (always rotate counter clockwise)
        else {
          // Example: 1 - 1 + 1.50 = 1.50
          return (currentIntegerPart - 1 + targetPositionValue) * Math.PI;
        }
      }
      // Current alpha negative values
      //    -0.75=c             c=-0.25         
      //                 t=-0.50
      //            x---------x
      //            |    b    |
      //            | l -|- r | 
      //            |    f    |  
      //            x---------x
      //            
      else {
        targetPositionValue = -0.50;

        // If current position is lower than target <-0.50, -2)
        if (targetPositionValue - currentPositionValue >= 0) {
          // If current position in <-0.50, -1)
          if (currentPositionValue <= -0.50 && currentPositionValue > -1) {
            // Example: 0 + (-0.50) = -0.50
            return (currentIntegerPart + targetPositionValue) * Math.PI;
          }
          // If current position in <-1, -1.50) (rotate clockwise)
          else if (currentPositionValue <= -1 && currentPositionValue > -1.50) {
            // Example: -1 + 1 + (-0.50) = -0.50
            return (currentIntegerPart + 1 + targetPositionValue) * Math.PI;
          }
          // If current position in <-1.50, -2) (rotate counter clockwise)
          else if (currentPositionValue <= -1.50 && currentPositionValue > -2) {
            // Example: -1 - 1 + (-0.50) = -2.50.
            return (currentIntegerPart - 1 + targetPositionValue) * Math.PI;
          }
        }
        // If current posiotion is higher thane target <0, -0.50)
        else {
          // Example: 0 + (-0.50) = -0.50
          return (currentIntegerPart + targetPositionValue) * Math.PI;
        }
      }
    }
    else if (vector.x == 1 && vector.y == 1) {
      let targetPositionValue;

      // Current alpha positive values
      //                 c=1.50
      //     1.25=c             t=1.75         
      //            x---------x
      //            |    b    |
      //            | l -|- r | c=0.00
      //            |    f    |  
      //            x---------x c=0.25
      //            
      if (currentAlpha >= 0) {
        targetPositionValue = 1.75;

        // If current position is lower than target <0, 1.75)
        if (targetPositionValue - currentPositionValue > 0) {
          // If current postion in <0, 0.75) interval (rotate counter clockwise)
          if (currentPositionValue >= 0 && currentPositionValue < 0.75) {
            // Example: 0 - 2 + 1.75 = -0.25
            // Example: 2 - 2 + 1.75 = 1.75
            return (currentIntegerPart - 2 + targetPositionValue) * Math.PI;
          }
          // If current postion in <0.75, 1.00) interval (rotate clockwise)
          else if (currentPositionValue >= 0.75 && currentPositionValue < 1) {
            // Example: 0 + 1.75 = 1.75
            return (currentIntegerPart + targetPositionValue) * Math.PI;
          }
          // If current Postion in <1, 1.75)
          else if (currentPositionValue >= 1 && currentPositionValue < 1.75) {
            // Example: 1 - 1 + 1.75 = 1.75
            return (currentIntegerPart - 1 + targetPositionValue) * Math.PI;
          }
        }
        // If current position is higher than target <1.75, 2) (always rotate counter clockwise)
        else {
          // Example: 1 - 1 + 1.75 = 1.75
          return (currentIntegerPart - 1 + targetPositionValue) * Math.PI;
        }
      }
      // Current alpha negative values
      //                 c=-0.50
      //    -0.75=c             t=-0.25         
      //            x---------x
      //            |    b    |
      //            | l -|- r | c=0.00
      //            |    f    |  
      //            x---------x c=0.25
      //            
      else {
        targetPositionValue = -0.25;

        // If current position is lower than target <-0.25, -2)
        if (targetPositionValue - currentPositionValue >= 0) {
          // If current position in <-0.25, -1)
          if (currentPositionValue <= -0.25 && currentPositionValue > -1) {
            // Example: 0 + (-0.25) = -0.25
            return (currentIntegerPart + targetPositionValue) * Math.PI;
          }
          // If current position in <-1, -1.25) (rotate clockwise)
          else if (currentPositionValue <= -1 && currentPositionValue > -1.25) {
            // Example: -1 + 1 + (-0.50) = -0.50
            return (currentIntegerPart + 1 + targetPositionValue) * Math.PI;
          }
          // If current position in <-1.25, -2) (rotate counter clockwise)
          else if (currentPositionValue <= -1.25 && currentPositionValue > -2) {
            // Example: -1 - 1 + (-0.25) = -2.25.
            return (currentIntegerPart - 1 + targetPositionValue) * Math.PI;
          }
        }
        // If current posiotion is higher thane target <0, -0.25)
        else {
          // Example: 0 + (-0.25) = -0.25
          return (currentIntegerPart + targetPositionValue) * Math.PI;
        }
      }
    }
    // Top && bottom
    else if (vector.x == 0 && vector.y == 0) {
      let targetPositionValue;

      targetPositionValue = toNumber((Math.round(currentPositionValue * 4) / 4).toFixed(2));
      return targetPositionValue * Math.PI;
    }

    return currentAlpha;
  }

  /**
   * How far the camera has to stand to fit the whole model in view.
   *
   * The same answer the preview frames a scenario with, so flying to a side
   * lands at the distance the model opened at rather than at one of its own.
   */
  public getRadius(): number {
    return this.babylonService.radiusToFit();
  }

  private createFrontPlane() {
    // Material
    var materialFrontPlane = new BABYLON.StandardMaterial("materialFront", this.babylonService.scene);
    materialFrontPlane.ambientColor = BABYLON.Color3.FromInts(117, 219, 255);
    materialFrontPlane.alpha = 0.0;
    // Mesh
    this.frontPlane = BABYLON.Mesh.CreatePlane("front", 0.7, this.babylonService.scene, true);
    this.frontPlane.material = materialFrontPlane;
    this.frontPlane.position.y = -0.51;
    this.frontPlane.rotation = new BABYLON.Vector3(-Math.PI / 2, 0, 0);
  }
  private createBackPlane() {
    // Material
    var materialBackPlane = new BABYLON.StandardMaterial("materialBack", this.babylonService.scene);
    materialBackPlane.ambientColor = BABYLON.Color3.FromInts(117, 219, 255);
    materialBackPlane.alpha = 0.0;
    // Mesh
    this.backPlane = BABYLON.Mesh.CreatePlane("back", 0.7, this.babylonService.scene, true);
    this.backPlane.material = materialBackPlane;
    this.backPlane.position.y = 0.51;
    this.backPlane.rotation = new BABYLON.Vector3(Math.PI / 2, 0, 0);
  }
  private createRightPlane() {
    // Material
    var materialRightPlane = new BABYLON.StandardMaterial("materialRight", this.babylonService.scene);
    materialRightPlane.ambientColor = BABYLON.Color3.FromInts(117, 219, 255);
    materialRightPlane.alpha = 0.0;
    // Mesh
    this.rightPlane = BABYLON.Mesh.CreatePlane("right", 0.7, this.babylonService.scene, true);
    this.rightPlane.material = materialRightPlane;
    this.rightPlane.position.y = 0;
    this.rightPlane.position.x = 0.51;
    this.rightPlane.rotation = new BABYLON.Vector3(0, -Math.PI / 2, 0);
  }
  private createLeftPlane() {
    // Material
    var materialLeftPlane = new BABYLON.StandardMaterial("materialLeft", this.babylonService.scene);
    materialLeftPlane.ambientColor = BABYLON.Color3.FromInts(117, 219, 255);
    materialLeftPlane.alpha = 0.0;
    // Mesh
    this.leftPlane = BABYLON.Mesh.CreatePlane("left", 0.7, this.babylonService.scene, true);
    this.leftPlane.material = materialLeftPlane;
    this.leftPlane.position.y = 0;
    this.leftPlane.position.x = -0.51;
    this.leftPlane.rotation = new BABYLON.Vector3(0, Math.PI / 2, 0);
  }
  private createTopPlane() {
    // Material
    var materialTopPlane = new BABYLON.StandardMaterial("materialTop", this.babylonService.scene);
    materialTopPlane.ambientColor = BABYLON.Color3.FromInts(117, 219, 255);
    materialTopPlane.alpha = 0.0;
    // Mesh
    this.topPlane = BABYLON.Mesh.CreatePlane("top", 0.7, this.babylonService.scene, true);
    this.topPlane.material = materialTopPlane;
    this.topPlane.position.y = 0;
    this.topPlane.position.z = 0.51;
    this.topPlane.rotation = new BABYLON.Vector3(0, Math.PI, Math.PI);
  }
  private createBottomPlane() {
    // Material
    var materialBottomPlane = new BABYLON.StandardMaterial("materialBottom", this.babylonService.scene);
    materialBottomPlane.ambientColor = BABYLON.Color3.FromInts(117, 219, 255);
    materialBottomPlane.alpha = 0.0;
    // Mesh
    this.bottomPlane = BABYLON.Mesh.CreatePlane("bottom", 0.7, this.babylonService.scene, true);
    this.bottomPlane.material = materialBottomPlane;
    this.bottomPlane.position.y = 0;
    this.bottomPlane.position.z = -0.51;
    this.bottomPlane.rotation = new BABYLON.Vector3(0, 0, -Math.PI / 2);
  }
  private createRightTopFrontBox() {

    this.rightTopFrontBox = BABYLON.MeshBuilder.CreateBox("rightTopFront", { width: 0.2, height: 0.2, depth: 0.2 }, this.babylonService.scene);
    var materialRightTopFront = new BABYLON.StandardMaterial("materialRightTopFront", this.babylonService.scene);
    materialRightTopFront.ambientColor = BABYLON.Color3.FromInts(117, 219, 255);
    materialRightTopFront.alpha = 0.0;
    materialRightTopFront.backFaceCulling = false;
    this.rightTopFrontBox.material = materialRightTopFront;
    this.rightTopFrontBox.position.x = 0.5;
    this.rightTopFrontBox.position.y = -0.5;
    this.rightTopFrontBox.position.z = 0.5;
  }
  private createLeftTopFrontBox() {

    this.leftTopFrontBox = BABYLON.MeshBuilder.CreateBox("leftTopFront", { width: 0.2, height: 0.2, depth: 0.2 }, this.babylonService.scene);
    var materialLeftTopFront = new BABYLON.StandardMaterial("materialLeftTopFront", this.babylonService.scene);
    materialLeftTopFront.ambientColor = BABYLON.Color3.FromInts(117, 219, 255);
    materialLeftTopFront.alpha = 0.0;
    materialLeftTopFront.backFaceCulling = false;
    this.leftTopFrontBox.material = materialLeftTopFront;
    this.leftTopFrontBox.position.x = -0.5;
    this.leftTopFrontBox.position.y = -0.5;
    this.leftTopFrontBox.position.z = 0.5;
  }
  private createRightTopBackBox() {

    this.rightTopBackBox = BABYLON.MeshBuilder.CreateBox("rightTopBack", { width: 0.2, height: 0.2, depth: 0.2 }, this.babylonService.scene);
    var materialRightTopBack = new BABYLON.StandardMaterial("materialRightTopBack", this.babylonService.scene);
    materialRightTopBack.ambientColor = BABYLON.Color3.FromInts(117, 219, 255);
    materialRightTopBack.alpha = 0.0;
    materialRightTopBack.backFaceCulling = false;
    this.rightTopBackBox.material = materialRightTopBack;
    this.rightTopBackBox.position.x = 0.5;
    this.rightTopBackBox.position.y = 0.5;
    this.rightTopBackBox.position.z = 0.5;
  }
  private createLeftTopBackBox() {

    this.leftTopBackBox = BABYLON.MeshBuilder.CreateBox("leftTopBack", { width: 0.2, height: 0.2, depth: 0.2 }, this.babylonService.scene);
    var materialLeftTopBack = new BABYLON.StandardMaterial("materialLeftTopBack", this.babylonService.scene);
    materialLeftTopBack.ambientColor = BABYLON.Color3.FromInts(117, 219, 255);
    materialLeftTopBack.alpha = 0.0;
    materialLeftTopBack.backFaceCulling = false;
    this.leftTopBackBox.material = materialLeftTopBack;
    this.leftTopBackBox.position.x = -0.5;
    this.leftTopBackBox.position.y = 0.5;
    this.leftTopBackBox.position.z = 0.5;
  }
  private createRightBottomFrontBox() {

    this.rightBottomFrontBox = BABYLON.MeshBuilder.CreateBox("rightBottomFront", { width: 0.2, height: 0.2, depth: 0.2 }, this.babylonService.scene);
    var materialRightBottomFront = new BABYLON.StandardMaterial("materialRightBottomFront", this.babylonService.scene);
    materialRightBottomFront.ambientColor = BABYLON.Color3.FromInts(117, 219, 255);
    materialRightBottomFront.alpha = 0.0;
    materialRightBottomFront.backFaceCulling = false;
    this.rightBottomFrontBox.material = materialRightBottomFront;
    this.rightBottomFrontBox.position.x = 0.5;
    this.rightBottomFrontBox.position.y = -0.5;
    this.rightBottomFrontBox.position.z = -0.5;
  }
  private createLeftBottomFrontBox() {

    this.leftBottomFrontBox = BABYLON.MeshBuilder.CreateBox("leftBottomFront", { width: 0.2, height: 0.2, depth: 0.2 }, this.babylonService.scene);
    var materialLeftBottomFront = new BABYLON.StandardMaterial("materialLeftBottomFront", this.babylonService.scene);
    materialLeftBottomFront.ambientColor = BABYLON.Color3.FromInts(117, 219, 255);
    materialLeftBottomFront.alpha = 0.0;
    materialLeftBottomFront.backFaceCulling = false;
    this.leftBottomFrontBox.material = materialLeftBottomFront;
    this.leftBottomFrontBox.position.x = -0.5;
    this.leftBottomFrontBox.position.y = -0.5;
    this.leftBottomFrontBox.position.z = -0.5;
  }
  private createRightBottomBackBox() {

    this.rightBottomBackBox = BABYLON.MeshBuilder.CreateBox("rightBottomBack", { width: 0.2, height: 0.2, depth: 0.2 }, this.babylonService.scene);
    var materialRightBottomBack = new BABYLON.StandardMaterial("materialRightBottomBack", this.babylonService.scene);
    materialRightBottomBack.ambientColor = BABYLON.Color3.FromInts(117, 219, 255);
    materialRightBottomBack.alpha = 0.0;
    materialRightBottomBack.backFaceCulling = false;
    this.rightBottomBackBox.material = materialRightBottomBack;
    this.rightBottomBackBox.position.x = 0.5;
    this.rightBottomBackBox.position.y = 0.5;
    this.rightBottomBackBox.position.z = -0.5;
  }
  private createLeftBottomBackBox() {

    this.leftBottomBackBox = BABYLON.MeshBuilder.CreateBox("leftBottomBack", { width: 0.2, height: 0.2, depth: 0.2 }, this.babylonService.scene);
    var materialLeftBottomBack = new BABYLON.StandardMaterial("materialLeftBottomBack", this.babylonService.scene);
    materialLeftBottomBack.ambientColor = BABYLON.Color3.FromInts(117, 219, 255);
    materialLeftBottomBack.alpha = 0.0;
    materialLeftBottomBack.backFaceCulling = false;
    this.leftBottomBackBox.material = materialLeftBottomBack;
    this.leftBottomBackBox.position.x = -0.5;
    this.leftBottomBackBox.position.y = 0.5;
    this.leftBottomBackBox.position.z = -0.5;
  }
  private createTopFrontBox() {

    this.topFrontBox = BABYLON.MeshBuilder.CreateBox("topFront", { width: 0.6, height: 0.2, depth: 0.2 }, this.babylonService.scene);
    var materialTopFront = new BABYLON.StandardMaterial("materialTopFront", this.babylonService.scene);
    materialTopFront.ambientColor = BABYLON.Color3.FromInts(117, 219, 255);
    materialTopFront.alpha = 0.0;
    materialTopFront.backFaceCulling = false;
    this.topFrontBox.material = materialTopFront;
    this.topFrontBox.position.x = 0;
    this.topFrontBox.position.y = -0.5;
    this.topFrontBox.position.z = 0.5;
  }
  private createTopBackBox() {

    this.topBackBox = BABYLON.MeshBuilder.CreateBox("topBack", { width: 0.6, height: 0.2, depth: 0.2 }, this.babylonService.scene);
    var materialTopBack = new BABYLON.StandardMaterial("materialTopBack", this.babylonService.scene);
    materialTopBack.ambientColor = BABYLON.Color3.FromInts(117, 219, 255);
    materialTopBack.alpha = 0.0;
    materialTopBack.backFaceCulling = false;
    this.topBackBox.material = materialTopBack;
    this.topBackBox.position.x = 0;
    this.topBackBox.position.y = 0.5;
    this.topBackBox.position.z = 0.5;
  }
  private createTopRightBox() {

    this.topRightBox = BABYLON.MeshBuilder.CreateBox("topRight", { width: 0.2, height: 0.6, depth: 0.2 }, this.babylonService.scene);
    var materialTopRight = new BABYLON.StandardMaterial("materialTopRight", this.babylonService.scene);
    materialTopRight.ambientColor = BABYLON.Color3.FromInts(117, 219, 255);
    materialTopRight.alpha = 0.0;
    materialTopRight.backFaceCulling = false;
    this.topRightBox.material = materialTopRight;
    this.topRightBox.position.x = 0.5;
    this.topRightBox.position.y = 0;
    this.topRightBox.position.z = 0.5;
  }
  private createTopLeftBox() {

    this.topLeftBox = BABYLON.MeshBuilder.CreateBox("topLeft", { width: 0.2, height: 0.6, depth: 0.2 }, this.babylonService.scene);
    var materialTopLeft = new BABYLON.StandardMaterial("materialTopLeft", this.babylonService.scene);
    materialTopLeft.ambientColor = BABYLON.Color3.FromInts(117, 219, 255);
    materialTopLeft.alpha = 0.0;
    materialTopLeft.backFaceCulling = false;
    this.topLeftBox.material = materialTopLeft;
    this.topLeftBox.position.x = -0.5;
    this.topLeftBox.position.y = 0;
    this.topLeftBox.position.z = 0.5;
  }
  private createBottomFrontBox() {

    this.bottomFrontBox = BABYLON.MeshBuilder.CreateBox("bottomFront", { width: 0.6, height: 0.2, depth: 0.2 }, this.babylonService.scene);
    var materialBottomFront = new BABYLON.StandardMaterial("materialBottomFront", this.babylonService.scene);
    materialBottomFront.ambientColor = BABYLON.Color3.FromInts(117, 219, 255);
    materialBottomFront.alpha = 0.0;
    materialBottomFront.backFaceCulling = false;
    this.bottomFrontBox.material = materialBottomFront;
    this.bottomFrontBox.position.x = 0;
    this.bottomFrontBox.position.y = -0.5;
    this.bottomFrontBox.position.z = -0.5;
  }
  private createBottomBackBox() {

    this.bottomBackBox = BABYLON.MeshBuilder.CreateBox("bottomBack", { width: 0.6, height: 0.2, depth: 0.2 }, this.babylonService.scene);
    var materialBottomBack = new BABYLON.StandardMaterial("materialBottomBack", this.babylonService.scene);
    materialBottomBack.ambientColor = BABYLON.Color3.FromInts(117, 219, 255);
    materialBottomBack.alpha = 0.0;
    materialBottomBack.backFaceCulling = false;
    this.bottomBackBox.material = materialBottomBack;
    this.bottomBackBox.position.x = 0;
    this.bottomBackBox.position.y = 0.5;
    this.bottomBackBox.position.z = -0.5;
  }
  private createBottomRightBox() {

    this.bottomRightBox = BABYLON.MeshBuilder.CreateBox("bottomRight", { width: 0.2, height: 0.6, depth: 0.2 }, this.babylonService.scene);
    var materialBottomRight = new BABYLON.StandardMaterial("materialBottomRight", this.babylonService.scene);
    materialBottomRight.ambientColor = BABYLON.Color3.FromInts(117, 219, 255);
    materialBottomRight.alpha = 0.0;
    materialBottomRight.backFaceCulling = false;
    this.bottomRightBox.material = materialBottomRight;
    this.bottomRightBox.position.x = 0.5;
    this.bottomRightBox.position.y = 0;
    this.bottomRightBox.position.z = -0.5;
  }
  private createBottomLeftBox() {

    this.bottomLeftBox = BABYLON.MeshBuilder.CreateBox("bottomLeft", { width: 0.2, height: 0.6, depth: 0.2 }, this.babylonService.scene);
    var materialBottomLeft = new BABYLON.StandardMaterial("materialBottomLeft", this.babylonService.scene);
    materialBottomLeft.ambientColor = BABYLON.Color3.FromInts(117, 219, 255);
    materialBottomLeft.alpha = 0.0;
    materialBottomLeft.backFaceCulling = false;
    this.bottomLeftBox.material = materialBottomLeft;
    this.bottomLeftBox.position.x = -0.5;
    this.bottomLeftBox.position.y = 0;
    this.bottomLeftBox.position.z = -0.5;
  }
  private createFrontRightBox() {

    this.frontRightBox = BABYLON.MeshBuilder.CreateBox("frontRight", { width: 0.2, height: 0.2, depth: 0.6 }, this.babylonService.scene);
    var materialFrontRight = new BABYLON.StandardMaterial("materialFrontRight", this.babylonService.scene);
    materialFrontRight.ambientColor = BABYLON.Color3.FromInts(117, 219, 255);
    materialFrontRight.alpha = 0.0;
    materialFrontRight.backFaceCulling = false;
    this.frontRightBox.material = materialFrontRight;
    this.frontRightBox.position.x = 0.5;
    this.frontRightBox.position.y = -0.5;
    this.frontRightBox.position.z = 0;
  }
  private createFrontLeftBox() {

    this.frontLeftBox = BABYLON.MeshBuilder.CreateBox("frontLeft", { width: 0.2, height: 0.2, depth: 0.6 }, this.babylonService.scene);
    var materialFrontLeft = new BABYLON.StandardMaterial("materialFrontLeft", this.babylonService.scene);
    materialFrontLeft.ambientColor = BABYLON.Color3.FromInts(117, 219, 255);
    materialFrontLeft.alpha = 0.0;
    materialFrontLeft.backFaceCulling = false;
    this.frontLeftBox.material = materialFrontLeft;
    this.frontLeftBox.position.x = -0.5;
    this.frontLeftBox.position.y = -0.5;
    this.frontLeftBox.position.z = 0;
  }
  private createBackRightBox() {

    this.backRightBox = BABYLON.MeshBuilder.CreateBox("backRight", { width: 0.2, height: 0.2, depth: 0.6 }, this.babylonService.scene);
    var materialBackRight = new BABYLON.StandardMaterial("materialBackRight", this.babylonService.scene);
    materialBackRight.ambientColor = BABYLON.Color3.FromInts(117, 219, 255);
    materialBackRight.alpha = 0.0;
    materialBackRight.backFaceCulling = false;
    this.backRightBox.material = materialBackRight;
    this.backRightBox.position.x = 0.5;
    this.backRightBox.position.y = 0.5;
    this.backRightBox.position.z = 0;
  }
  private createBackLeftBox() {

    this.backLeftBox = BABYLON.MeshBuilder.CreateBox("backLeft", { width: 0.2, height: 0.2, depth: 0.6 }, this.babylonService.scene);
    var materialBackLeft = new BABYLON.StandardMaterial("materialBackLeft", this.babylonService.scene);
    materialBackLeft.ambientColor = BABYLON.Color3.FromInts(117, 219, 255);
    materialBackLeft.alpha = 0.0;
    materialBackLeft.backFaceCulling = false;
    this.backLeftBox.material = materialBackLeft;
    this.backLeftBox.position.x = -0.5;
    this.backLeftBox.position.y = 0.5;
    this.backLeftBox.position.z = 0;
  }
}
