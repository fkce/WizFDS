import { Injectable, isDevMode } from '@angular/core';
import { BabylonService } from '../babylon.service';
import * as BABYLON from 'babylonjs';
import { cloneDeep, toNumber } from 'lodash';
import { ObstService } from '../../drawing/obst/obst.service';

@Injectable({
  providedIn: 'root'
})
export class ViewCubeService {

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
    private obstService: ObstService
  ) { }

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
  }

  /**
   * Create view cube
   */
  private createViewCube() {

    // Create material with texture
    this.materialViewCube = new BABYLON.StandardMaterial("materialViewCube", this.babylonService.scene);
    var texture = new BABYLON.Texture("assets/images/viewcube.svg", this.babylonService.scene);
    this.materialViewCube.ambientColor = BABYLON.Color3.White();
    this.materialViewCube.ambientTexture = texture;

    let columns = 6, rows = 1;
    let faceUV = new Array(6);

    for (var i = 0; i < 6; i++) {
      faceUV[i] = new BABYLON.Vector4(i / columns, 0, (i + 1) / columns, 1 / rows);
    }

    let options = {
      width: 1,
      height: 1,
      depth: 1,
      faceUV: faceUV
    };

    // Create mesh
    this.viewCube = BABYLON.MeshBuilder.CreateBox("viewBox", options, this.babylonService.scene);
    this.viewCube.position.y = -1000;
    this.viewCube.material = this.materialViewCube;
    this.viewCube.enableEdgesRendering();
    this.viewCube.edgesWidth = 3;
    this.viewCube.edgesColor = BABYLON.Color4.FromInts(10, 10, 10, 255);

    // Ground
    this.materialViewCubeGround = new BABYLON.StandardMaterial("materialViewCubeGround", this.babylonService.scene);
    var textureGround = new BABYLON.Texture("assets/images/viewcubeground.svg", this.babylonService.scene);
    this.materialViewCubeGround.diffuseTexture = this.materialViewCubeGround.opacityTexture = textureGround;
    this.materialViewCubeGround.diffuseTexture.hasAlpha = true;

    var frontUV = new BABYLON.Vector4(0, 0, 1, 1);

    var optionsGround = {
      width: 1.65,
      height: 1.65,
      forntUVs: frontUV
    };
    this.viewCubeGround = BABYLON.MeshBuilder.CreatePlane("ground", optionsGround, this.babylonService.scene);
    this.viewCubeGround.material = this.materialViewCubeGround;
    this.viewCubeGround.isPickable = false;
    this.viewCubeGround.position.y = -1000;
    this.viewCubeGround.position.z = -0.6;
    this.viewCubeGround.rotation = new BABYLON.Vector3(0, Math.PI, 0);

    // CameraView
    this.cameraViewCube = new BABYLON.ArcRotateCamera("cameraView", 0, 0, 0.1, BABYLON.Vector3.Zero(), this.babylonService.scene);
    this.cameraViewCube.setPosition(new BABYLON.Vector3(0, 0, 2));
    // @ts-ignore
    this.cameraViewCube.target = this.viewCube;
    this.cameraViewCube.attachControl(this.babylonService.canvas, true);
    this.cameraViewCube.viewport = new BABYLON.Viewport(.85, .8, .2, .2);
    this.cameraViewCube.upVector = new BABYLON.Vector3(0, 0, 1);
    this.cameraViewCube.lowerRadiusLimit = 3;
    this.cameraViewCube.upperRadiusLimit = 3;

    this.babylonService.scene.activeCameras.push(this.cameraViewCube);
  }

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

    let bounding = cloneDeep(this.obstService.mesh.getBoundingInfo().boundingSphere);
    let boundingViewBox = cloneDeep(this.viewCube.getBoundingInfo().boundingSphere);

    let vector = new BABYLON.Vector3(bounding.centerWorld.x + cameraVector.x, bounding.centerWorld.y + cameraVector.y, bounding.centerWorld.z + cameraVector.z);
    let vectorViewCube = new BABYLON.Vector3(boundingViewBox.centerWorld.x + cameraVector.x, boundingViewBox.centerWorld.y + cameraVector.y, boundingViewBox.centerWorld.z + cameraVector.z);

    var cameraPosition = new BABYLON.Animation("animCameraPostion", "position", 30, BABYLON.Animation.ANIMATIONTYPE_VECTOR3, BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT);
    var cameraRadius = new BABYLON.Animation("animCameraRadius", "radius", 30, BABYLON.Animation.ANIMATIONTYPE_FLOAT, BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT);
    var cameraAlpha = new BABYLON.Animation("animCameraAlpha", "alpha", 30, BABYLON.Animation.ANIMATIONTYPE_FLOAT, BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT);
    var cameraTarget = new BABYLON.Animation("animCameraTarget", "target", 30, BABYLON.Animation.ANIMATIONTYPE_VECTOR3, BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT);
    var cameraViewCubePosition = new BABYLON.Animation("animCameraViewCubePosition", "position", 30, BABYLON.Animation.ANIMATIONTYPE_VECTOR3, BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT);
    var cameraViewCubeAlpha = new BABYLON.Animation("animCameraViewCubeAlpha", "alpha", 30, BABYLON.Animation.ANIMATIONTYPE_FLOAT, BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT);
    var cameraViewCubeTarget = new BABYLON.Animation("animCameraViewCubeTarget", "target", 30, BABYLON.Animation.ANIMATIONTYPE_VECTOR3, BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT);

    var cameraPositionKeys = [];
    var cameraRadiusKeys = [];
    var cameraAlphaKeys = [];
    var cameraTargetKeys = [];
    cameraPositionKeys.push({ frame: 0, value: this.babylonService.camera.position.clone() }, { frame: 15, value: vector });
    cameraRadiusKeys = [{ frame: 0, value: this.babylonService.camera.radius }, { frame: 15, value: this.getRadius() }];
    cameraAlphaKeys = [{ frame: 0, value: this.babylonService.camera.alpha }, { frame: 15, value: this.getAlpha(this.babylonService.camera.alpha, cameraVector) }];
    cameraTargetKeys.push({ frame: 0, value: this.babylonService.camera.target.clone() }, { frame: 15, value: bounding.centerWorld });

    var cameraViewCubeKeys = [];
    var cameraViewCubeAlphaKeys = [];
    var cameraViewCubeTargetKeys = [];
    cameraViewCubeKeys.push({ frame: 0, value: this.cameraViewCube.position.clone() }, { frame: 15, value: vectorViewCube });
    cameraViewCubeAlphaKeys = [{ frame: 0, value: this.cameraViewCube.alpha }, { frame: 15, value: this.getAlpha(this.cameraViewCube.alpha, cameraVector) }];
    cameraViewCubeTargetKeys.push({ frame: 0, value: this.cameraViewCube.target.clone() }, { frame: 15, value: boundingViewBox.centerWorld });

    cameraPosition.setKeys(cameraPositionKeys);
    cameraRadius.setKeys(cameraRadiusKeys);
    cameraAlpha.setKeys(cameraAlphaKeys);
    cameraTarget.setKeys(cameraTargetKeys);
    cameraViewCubePosition.setKeys(cameraViewCubeKeys);
    cameraViewCubeAlpha.setKeys(cameraViewCubeAlphaKeys);
    cameraViewCubeTarget.setKeys(cameraViewCubeTargetKeys);

    this.babylonService.camera.animations = [];
    this.cameraViewCube.animations = [];
    this.babylonService.camera.animations.push(cameraPosition);
    this.babylonService.camera.animations.push(cameraRadius);
    this.babylonService.camera.animations.push(cameraAlpha);
    this.babylonService.camera.animations.push(cameraTarget);
    this.cameraViewCube.animations.push(cameraViewCubePosition);
    this.cameraViewCube.animations.push(cameraViewCubeAlpha);
    this.cameraViewCube.animations.push(cameraViewCubeTarget);

    this.babylonService.scene.beginAnimation(this.babylonService.camera, 0, 15, false, 1);
    this.babylonService.scene.beginAnimation(this.cameraViewCube, 0, 15, false, 1);
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
   * Get radius parameter from obst mesh
   */
  public getRadius(): number {

    // Zoom in/out to mesh
    let radius = this.obstService.mesh.getBoundingInfo().boundingSphere.radiusWorld;
    let aspectRatio = this.babylonService.engine.getAspectRatio(this.babylonService.camera);
    let halfMinFov = this.babylonService.camera.fov / 2;
    if (aspectRatio < 1) {
      halfMinFov = Math.atan(aspectRatio * Math.tan(this.babylonService.camera.fov / 2));
    }
    return Math.abs(radius / Math.sin(halfMinFov));
    //this.babylonService.camera.radius = viewRadius;

  }

  private createFrontPlane() {
    // Material
    var materialFrontPlane = new BABYLON.StandardMaterial("materialFront", this.babylonService.scene);
    materialFrontPlane.ambientColor = BABYLON.Color3.FromInts(117, 219, 255);
    materialFrontPlane.alpha = 0.0;
    // Mesh
    this.frontPlane = BABYLON.Mesh.CreatePlane("front", 0.7, this.babylonService.scene, true);
    this.frontPlane.material = materialFrontPlane;
    this.frontPlane.position.y = -1000.51;
    this.frontPlane.rotation = new BABYLON.Vector3(-Math.PI / 2, 0, 0);
    this.frontPlane.actionManager = new BABYLON.ActionManager(this.babylonService.scene);
    this.frontPlane.actionManager.registerAction(new BABYLON.SetValueAction(BABYLON.ActionManager.OnPointerOverTrigger, this.frontPlane.material, "alpha", 0.5));
    this.frontPlane.actionManager.registerAction(new BABYLON.SetValueAction(BABYLON.ActionManager.OnPointerOutTrigger, this.frontPlane.material, "alpha", 0.0));
    this.frontPlane.actionManager.registerAction(new BABYLON.Action(BABYLON.ActionManager.OnPickDownTrigger));
  }
  private createBackPlane() {
    // Material
    var materialBackPlane = new BABYLON.StandardMaterial("materialBack", this.babylonService.scene);
    materialBackPlane.ambientColor = BABYLON.Color3.FromInts(117, 219, 255);
    materialBackPlane.alpha = 0.0;
    // Mesh
    this.backPlane = BABYLON.Mesh.CreatePlane("back", 0.7, this.babylonService.scene, true);
    this.backPlane.material = materialBackPlane;
    this.backPlane.position.y = -999.49;
    this.backPlane.rotation = new BABYLON.Vector3(Math.PI / 2, 0, 0);
    this.backPlane.actionManager = new BABYLON.ActionManager(this.babylonService.scene);
    this.backPlane.actionManager.registerAction(new BABYLON.SetValueAction(BABYLON.ActionManager.OnPointerOverTrigger, this.backPlane.material, "alpha", 0.5));
    this.backPlane.actionManager.registerAction(new BABYLON.SetValueAction(BABYLON.ActionManager.OnPointerOutTrigger, this.backPlane.material, "alpha", 0.0));
    this.backPlane.actionManager.registerAction(new BABYLON.Action(BABYLON.ActionManager.OnPickDownTrigger));
  }
  private createRightPlane() {
    // Material
    var materialRightPlane = new BABYLON.StandardMaterial("materialRight", this.babylonService.scene);
    materialRightPlane.ambientColor = BABYLON.Color3.FromInts(117, 219, 255);
    materialRightPlane.alpha = 0.0;
    // Mesh
    this.rightPlane = BABYLON.Mesh.CreatePlane("right", 0.7, this.babylonService.scene, true);
    this.rightPlane.material = materialRightPlane;
    this.rightPlane.position.y = -1000;
    this.rightPlane.position.x = 0.51;
    this.rightPlane.rotation = new BABYLON.Vector3(0, -Math.PI / 2, 0);
    this.rightPlane.actionManager = new BABYLON.ActionManager(this.babylonService.scene);
    this.rightPlane.actionManager.registerAction(new BABYLON.SetValueAction(BABYLON.ActionManager.OnPointerOverTrigger, this.rightPlane.material, "alpha", 0.5));
    this.rightPlane.actionManager.registerAction(new BABYLON.SetValueAction(BABYLON.ActionManager.OnPointerOutTrigger, this.rightPlane.material, "alpha", 0.0));
    this.rightPlane.actionManager.registerAction(new BABYLON.Action(BABYLON.ActionManager.OnPickDownTrigger));
  }
  private createLeftPlane() {
    // Material
    var materialLeftPlane = new BABYLON.StandardMaterial("materialLeft", this.babylonService.scene);
    materialLeftPlane.ambientColor = BABYLON.Color3.FromInts(117, 219, 255);
    materialLeftPlane.alpha = 0.0;
    // Mesh
    this.leftPlane = BABYLON.Mesh.CreatePlane("left", 0.7, this.babylonService.scene, true);
    this.leftPlane.material = materialLeftPlane;
    this.leftPlane.position.y = -1000;
    this.leftPlane.position.x = -0.51;
    this.leftPlane.rotation = new BABYLON.Vector3(0, Math.PI / 2, 0);
    this.leftPlane.actionManager = new BABYLON.ActionManager(this.babylonService.scene);
    this.leftPlane.actionManager.registerAction(new BABYLON.SetValueAction(BABYLON.ActionManager.OnPointerOverTrigger, this.leftPlane.material, "alpha", 0.5));
    this.leftPlane.actionManager.registerAction(new BABYLON.SetValueAction(BABYLON.ActionManager.OnPointerOutTrigger, this.leftPlane.material, "alpha", 0.0));
    this.leftPlane.actionManager.registerAction(new BABYLON.Action(BABYLON.ActionManager.OnPickDownTrigger));
  }
  private createTopPlane() {
    // Material
    var materialTopPlane = new BABYLON.StandardMaterial("materialTop", this.babylonService.scene);
    materialTopPlane.ambientColor = BABYLON.Color3.FromInts(117, 219, 255);
    materialTopPlane.alpha = 0.0;
    // Mesh
    this.topPlane = BABYLON.Mesh.CreatePlane("top", 0.7, this.babylonService.scene, true);
    this.topPlane.material = materialTopPlane;
    this.topPlane.position.y = -1000;
    this.topPlane.position.z = 0.51;
    this.topPlane.rotation = new BABYLON.Vector3(0, Math.PI, Math.PI);
    this.topPlane.actionManager = new BABYLON.ActionManager(this.babylonService.scene);
    this.topPlane.actionManager.registerAction(new BABYLON.SetValueAction(BABYLON.ActionManager.OnPointerOverTrigger, this.topPlane.material, "alpha", 0.5));
    this.topPlane.actionManager.registerAction(new BABYLON.SetValueAction(BABYLON.ActionManager.OnPointerOutTrigger, this.topPlane.material, "alpha", 0.0));
    this.topPlane.actionManager.registerAction(new BABYLON.Action(BABYLON.ActionManager.OnPickDownTrigger));
  }
  private createBottomPlane() {
    // Material
    var materialBottomPlane = new BABYLON.StandardMaterial("materialBottom", this.babylonService.scene);
    materialBottomPlane.ambientColor = BABYLON.Color3.FromInts(117, 219, 255);
    materialBottomPlane.alpha = 0.0;
    // Mesh
    this.bottomPlane = BABYLON.Mesh.CreatePlane("bottom", 0.7, this.babylonService.scene, true);
    this.bottomPlane.material = materialBottomPlane;
    this.bottomPlane.position.y = -1000;
    this.bottomPlane.position.z = -0.51;
    this.bottomPlane.rotation = new BABYLON.Vector3(0, 0, -Math.PI / 2);
    this.bottomPlane.actionManager = new BABYLON.ActionManager(this.babylonService.scene);
    this.bottomPlane.actionManager.registerAction(new BABYLON.SetValueAction(BABYLON.ActionManager.OnPointerOverTrigger, this.bottomPlane.material, "alpha", 0.5));
    this.bottomPlane.actionManager.registerAction(new BABYLON.SetValueAction(BABYLON.ActionManager.OnPointerOutTrigger, this.bottomPlane.material, "alpha", 0.0));
    this.bottomPlane.actionManager.registerAction(new BABYLON.Action(BABYLON.ActionManager.OnPickDownTrigger));
  }
  private createRightTopFrontBox() {

    this.rightTopFrontBox = BABYLON.MeshBuilder.CreateBox("rightTopFront", { width: 0.2, height: 0.2, depth: 0.2 }, this.babylonService.scene);
    var materialRightTopFront = new BABYLON.StandardMaterial("materialRightTopFront", this.babylonService.scene);
    materialRightTopFront.ambientColor = BABYLON.Color3.FromInts(117, 219, 255);
    materialRightTopFront.alpha = 0.0;
    materialRightTopFront.backFaceCulling = false;
    this.rightTopFrontBox.material = materialRightTopFront;
    this.rightTopFrontBox.position.x = 0.5;
    this.rightTopFrontBox.position.y = -1000.5;
    this.rightTopFrontBox.position.z = 0.5;
    this.rightTopFrontBox.actionManager = new BABYLON.ActionManager(this.babylonService.scene);
    this.rightTopFrontBox.actionManager.registerAction(new BABYLON.SetValueAction(BABYLON.ActionManager.OnPointerOverTrigger, this.rightTopFrontBox.material, "alpha", 0.5));
    this.rightTopFrontBox.actionManager.registerAction(new BABYLON.SetValueAction(BABYLON.ActionManager.OnPointerOutTrigger, this.rightTopFrontBox.material, "alpha", 0.0));
    this.rightTopFrontBox.actionManager.registerAction(new BABYLON.Action(BABYLON.ActionManager.OnPickDownTrigger));
  }
  private createLeftTopFrontBox() {

    this.leftTopFrontBox = BABYLON.MeshBuilder.CreateBox("leftTopFront", { width: 0.2, height: 0.2, depth: 0.2 }, this.babylonService.scene);
    var materialLeftTopFront = new BABYLON.StandardMaterial("materialLeftTopFront", this.babylonService.scene);
    materialLeftTopFront.ambientColor = BABYLON.Color3.FromInts(117, 219, 255);
    materialLeftTopFront.alpha = 0.0;
    materialLeftTopFront.backFaceCulling = false;
    this.leftTopFrontBox.material = materialLeftTopFront;
    this.leftTopFrontBox.position.x = -0.5;
    this.leftTopFrontBox.position.y = -1000.5;
    this.leftTopFrontBox.position.z = 0.5;
    this.leftTopFrontBox.actionManager = new BABYLON.ActionManager(this.babylonService.scene);
    this.leftTopFrontBox.actionManager.registerAction(new BABYLON.SetValueAction(BABYLON.ActionManager.OnPointerOverTrigger, this.leftTopFrontBox.material, "alpha", 0.5));
    this.leftTopFrontBox.actionManager.registerAction(new BABYLON.SetValueAction(BABYLON.ActionManager.OnPointerOutTrigger, this.leftTopFrontBox.material, "alpha", 0.0));
    this.leftTopFrontBox.actionManager.registerAction(new BABYLON.Action(BABYLON.ActionManager.OnPickDownTrigger));
  }
  private createRightTopBackBox() {

    this.rightTopBackBox = BABYLON.MeshBuilder.CreateBox("rightTopBack", { width: 0.2, height: 0.2, depth: 0.2 }, this.babylonService.scene);
    var materialRightTopBack = new BABYLON.StandardMaterial("materialRightTopBack", this.babylonService.scene);
    materialRightTopBack.ambientColor = BABYLON.Color3.FromInts(117, 219, 255);
    materialRightTopBack.alpha = 0.0;
    materialRightTopBack.backFaceCulling = false;
    this.rightTopBackBox.material = materialRightTopBack;
    this.rightTopBackBox.position.x = 0.5;
    this.rightTopBackBox.position.y = -999.5;
    this.rightTopBackBox.position.z = 0.5;
    this.rightTopBackBox.actionManager = new BABYLON.ActionManager(this.babylonService.scene);
    this.rightTopBackBox.actionManager.registerAction(new BABYLON.SetValueAction(BABYLON.ActionManager.OnPointerOverTrigger, this.rightTopBackBox.material, "alpha", 0.5));
    this.rightTopBackBox.actionManager.registerAction(new BABYLON.SetValueAction(BABYLON.ActionManager.OnPointerOutTrigger, this.rightTopBackBox.material, "alpha", 0.0));
    this.rightTopBackBox.actionManager.registerAction(new BABYLON.Action(BABYLON.ActionManager.OnPickDownTrigger));
  }
  private createLeftTopBackBox() {

    this.leftTopBackBox = BABYLON.MeshBuilder.CreateBox("leftTopBack", { width: 0.2, height: 0.2, depth: 0.2 }, this.babylonService.scene);
    var materialLeftTopBack = new BABYLON.StandardMaterial("materialLeftTopBack", this.babylonService.scene);
    materialLeftTopBack.ambientColor = BABYLON.Color3.FromInts(117, 219, 255);
    materialLeftTopBack.alpha = 0.0;
    materialLeftTopBack.backFaceCulling = false;
    this.leftTopBackBox.material = materialLeftTopBack;
    this.leftTopBackBox.position.x = -0.5;
    this.leftTopBackBox.position.y = -999.5;
    this.leftTopBackBox.position.z = 0.5;
    this.leftTopBackBox.actionManager = new BABYLON.ActionManager(this.babylonService.scene);
    this.leftTopBackBox.actionManager.registerAction(new BABYLON.SetValueAction(BABYLON.ActionManager.OnPointerOverTrigger, this.leftTopBackBox.material, "alpha", 0.5));
    this.leftTopBackBox.actionManager.registerAction(new BABYLON.SetValueAction(BABYLON.ActionManager.OnPointerOutTrigger, this.leftTopBackBox.material, "alpha", 0.0));
    this.leftTopBackBox.actionManager.registerAction(new BABYLON.Action(BABYLON.ActionManager.OnPickDownTrigger));
  }
  private createRightBottomFrontBox() {

    this.rightBottomFrontBox = BABYLON.MeshBuilder.CreateBox("rightBottomFront", { width: 0.2, height: 0.2, depth: 0.2 }, this.babylonService.scene);
    var materialRightBottomFront = new BABYLON.StandardMaterial("materialRightBottomFront", this.babylonService.scene);
    materialRightBottomFront.ambientColor = BABYLON.Color3.FromInts(117, 219, 255);
    materialRightBottomFront.alpha = 0.0;
    materialRightBottomFront.backFaceCulling = false;
    this.rightBottomFrontBox.material = materialRightBottomFront;
    this.rightBottomFrontBox.position.x = 0.5;
    this.rightBottomFrontBox.position.y = -1000.5;
    this.rightBottomFrontBox.position.z = -0.5;
    this.rightBottomFrontBox.actionManager = new BABYLON.ActionManager(this.babylonService.scene);
    this.rightBottomFrontBox.actionManager.registerAction(new BABYLON.SetValueAction(BABYLON.ActionManager.OnPointerOverTrigger, this.rightBottomFrontBox.material, "alpha", 0.5));
    this.rightBottomFrontBox.actionManager.registerAction(new BABYLON.SetValueAction(BABYLON.ActionManager.OnPointerOutTrigger, this.rightBottomFrontBox.material, "alpha", 0.0));
    this.rightBottomFrontBox.actionManager.registerAction(new BABYLON.Action(BABYLON.ActionManager.OnPickDownTrigger));
  }
  private createLeftBottomFrontBox() {

    this.leftBottomFrontBox = BABYLON.MeshBuilder.CreateBox("leftBottomFront", { width: 0.2, height: 0.2, depth: 0.2 }, this.babylonService.scene);
    var materialLeftBottomFront = new BABYLON.StandardMaterial("materialLeftBottomFront", this.babylonService.scene);
    materialLeftBottomFront.ambientColor = BABYLON.Color3.FromInts(117, 219, 255);
    materialLeftBottomFront.alpha = 0.0;
    materialLeftBottomFront.backFaceCulling = false;
    this.leftBottomFrontBox.material = materialLeftBottomFront;
    this.leftBottomFrontBox.position.x = -0.5;
    this.leftBottomFrontBox.position.y = -1000.5;
    this.leftBottomFrontBox.position.z = -0.5;
    this.leftBottomFrontBox.actionManager = new BABYLON.ActionManager(this.babylonService.scene);
    this.leftBottomFrontBox.actionManager.registerAction(new BABYLON.SetValueAction(BABYLON.ActionManager.OnPointerOverTrigger, this.leftBottomFrontBox.material, "alpha", 0.5));
    this.leftBottomFrontBox.actionManager.registerAction(new BABYLON.SetValueAction(BABYLON.ActionManager.OnPointerOutTrigger, this.leftBottomFrontBox.material, "alpha", 0.0));
    this.leftBottomFrontBox.actionManager.registerAction(new BABYLON.Action(BABYLON.ActionManager.OnPickDownTrigger));
  }
  private createRightBottomBackBox() {

    this.rightBottomBackBox = BABYLON.MeshBuilder.CreateBox("rightBottomBack", { width: 0.2, height: 0.2, depth: 0.2 }, this.babylonService.scene);
    var materialRightBottomBack = new BABYLON.StandardMaterial("materialRightBottomBack", this.babylonService.scene);
    materialRightBottomBack.ambientColor = BABYLON.Color3.FromInts(117, 219, 255);
    materialRightBottomBack.alpha = 0.0;
    materialRightBottomBack.backFaceCulling = false;
    this.rightBottomBackBox.material = materialRightBottomBack;
    this.rightBottomBackBox.position.x = 0.5;
    this.rightBottomBackBox.position.y = -999.5;
    this.rightBottomBackBox.position.z = -0.5;
    this.rightBottomBackBox.actionManager = new BABYLON.ActionManager(this.babylonService.scene);
    this.rightBottomBackBox.actionManager.registerAction(new BABYLON.SetValueAction(BABYLON.ActionManager.OnPointerOverTrigger, this.rightBottomBackBox.material, "alpha", 0.5));
    this.rightBottomBackBox.actionManager.registerAction(new BABYLON.SetValueAction(BABYLON.ActionManager.OnPointerOutTrigger, this.rightBottomBackBox.material, "alpha", 0.0));
    this.rightBottomBackBox.actionManager.registerAction(new BABYLON.Action(BABYLON.ActionManager.OnPickDownTrigger));
  }
  private createLeftBottomBackBox() {

    this.leftBottomBackBox = BABYLON.MeshBuilder.CreateBox("leftBottomBack", { width: 0.2, height: 0.2, depth: 0.2 }, this.babylonService.scene);
    var materialLeftBottomBack = new BABYLON.StandardMaterial("materialLeftBottomBack", this.babylonService.scene);
    materialLeftBottomBack.ambientColor = BABYLON.Color3.FromInts(117, 219, 255);
    materialLeftBottomBack.alpha = 0.0;
    materialLeftBottomBack.backFaceCulling = false;
    this.leftBottomBackBox.material = materialLeftBottomBack;
    this.leftBottomBackBox.position.x = -0.5;
    this.leftBottomBackBox.position.y = -999.5;
    this.leftBottomBackBox.position.z = -0.5;
    this.leftBottomBackBox.actionManager = new BABYLON.ActionManager(this.babylonService.scene);
    this.leftBottomBackBox.actionManager.registerAction(new BABYLON.SetValueAction(BABYLON.ActionManager.OnPointerOverTrigger, this.leftBottomBackBox.material, "alpha", 0.5));
    this.leftBottomBackBox.actionManager.registerAction(new BABYLON.SetValueAction(BABYLON.ActionManager.OnPointerOutTrigger, this.leftBottomBackBox.material, "alpha", 0.0));
    this.leftBottomBackBox.actionManager.registerAction(new BABYLON.Action(BABYLON.ActionManager.OnPickDownTrigger));
  }
  private createTopFrontBox() {

    this.topFrontBox = BABYLON.MeshBuilder.CreateBox("topFront", { width: 0.6, height: 0.2, depth: 0.2 }, this.babylonService.scene);
    var materialTopFront = new BABYLON.StandardMaterial("materialTopFront", this.babylonService.scene);
    materialTopFront.ambientColor = BABYLON.Color3.FromInts(117, 219, 255);
    materialTopFront.alpha = 0.0;
    materialTopFront.backFaceCulling = false;
    this.topFrontBox.material = materialTopFront;
    this.topFrontBox.position.x = 0;
    this.topFrontBox.position.y = -1000.5;
    this.topFrontBox.position.z = 0.5;
    this.topFrontBox.actionManager = new BABYLON.ActionManager(this.babylonService.scene);
    this.topFrontBox.actionManager.registerAction(new BABYLON.SetValueAction(BABYLON.ActionManager.OnPointerOverTrigger, this.topFrontBox.material, "alpha", 0.5));
    this.topFrontBox.actionManager.registerAction(new BABYLON.SetValueAction(BABYLON.ActionManager.OnPointerOutTrigger, this.topFrontBox.material, "alpha", 0.0));
    this.topFrontBox.actionManager.registerAction(new BABYLON.Action(BABYLON.ActionManager.OnPickDownTrigger));
  }
  private createTopBackBox() {

    this.topBackBox = BABYLON.MeshBuilder.CreateBox("topBack", { width: 0.6, height: 0.2, depth: 0.2 }, this.babylonService.scene);
    var materialTopBack = new BABYLON.StandardMaterial("materialTopBack", this.babylonService.scene);
    materialTopBack.ambientColor = BABYLON.Color3.FromInts(117, 219, 255);
    materialTopBack.alpha = 0.0;
    materialTopBack.backFaceCulling = false;
    this.topBackBox.material = materialTopBack;
    this.topBackBox.position.x = 0;
    this.topBackBox.position.y = -999.5;
    this.topBackBox.position.z = 0.5;
    this.topBackBox.actionManager = new BABYLON.ActionManager(this.babylonService.scene);
    this.topBackBox.actionManager.registerAction(new BABYLON.SetValueAction(BABYLON.ActionManager.OnPointerOverTrigger, this.topBackBox.material, "alpha", 0.5));
    this.topBackBox.actionManager.registerAction(new BABYLON.SetValueAction(BABYLON.ActionManager.OnPointerOutTrigger, this.topBackBox.material, "alpha", 0.0));
    this.topBackBox.actionManager.registerAction(new BABYLON.Action(BABYLON.ActionManager.OnPickDownTrigger));
  }
  private createTopRightBox() {

    this.topRightBox = BABYLON.MeshBuilder.CreateBox("topRight", { width: 0.2, height: 0.6, depth: 0.2 }, this.babylonService.scene);
    var materialTopRight = new BABYLON.StandardMaterial("materialTopRight", this.babylonService.scene);
    materialTopRight.ambientColor = BABYLON.Color3.FromInts(117, 219, 255);
    materialTopRight.alpha = 0.0;
    materialTopRight.backFaceCulling = false;
    this.topRightBox.material = materialTopRight;
    this.topRightBox.position.x = 0.5;
    this.topRightBox.position.y = -1000;
    this.topRightBox.position.z = 0.5;
    this.topRightBox.actionManager = new BABYLON.ActionManager(this.babylonService.scene);
    this.topRightBox.actionManager.registerAction(new BABYLON.SetValueAction(BABYLON.ActionManager.OnPointerOverTrigger, this.topRightBox.material, "alpha", 0.5));
    this.topRightBox.actionManager.registerAction(new BABYLON.SetValueAction(BABYLON.ActionManager.OnPointerOutTrigger, this.topRightBox.material, "alpha", 0.0));
    this.topRightBox.actionManager.registerAction(new BABYLON.Action(BABYLON.ActionManager.OnPickDownTrigger));
  }
  private createTopLeftBox() {

    this.topLeftBox = BABYLON.MeshBuilder.CreateBox("topLeft", { width: 0.2, height: 0.6, depth: 0.2 }, this.babylonService.scene);
    var materialTopLeft = new BABYLON.StandardMaterial("materialTopLeft", this.babylonService.scene);
    materialTopLeft.ambientColor = BABYLON.Color3.FromInts(117, 219, 255);
    materialTopLeft.alpha = 0.0;
    materialTopLeft.backFaceCulling = false;
    this.topLeftBox.material = materialTopLeft;
    this.topLeftBox.position.x = -0.5;
    this.topLeftBox.position.y = -1000;
    this.topLeftBox.position.z = 0.5;
    this.topLeftBox.actionManager = new BABYLON.ActionManager(this.babylonService.scene);
    this.topLeftBox.actionManager.registerAction(new BABYLON.SetValueAction(BABYLON.ActionManager.OnPointerOverTrigger, this.topLeftBox.material, "alpha", 0.5));
    this.topLeftBox.actionManager.registerAction(new BABYLON.SetValueAction(BABYLON.ActionManager.OnPointerOutTrigger, this.topLeftBox.material, "alpha", 0.0));
    this.topLeftBox.actionManager.registerAction(new BABYLON.Action(BABYLON.ActionManager.OnPickDownTrigger));
  }
  private createBottomFrontBox() {

    this.bottomFrontBox = BABYLON.MeshBuilder.CreateBox("bottomFront", { width: 0.6, height: 0.2, depth: 0.2 }, this.babylonService.scene);
    var materialBottomFront = new BABYLON.StandardMaterial("materialBottomFront", this.babylonService.scene);
    materialBottomFront.ambientColor = BABYLON.Color3.FromInts(117, 219, 255);
    materialBottomFront.alpha = 0.0;
    materialBottomFront.backFaceCulling = false;
    this.bottomFrontBox.material = materialBottomFront;
    this.bottomFrontBox.position.x = 0;
    this.bottomFrontBox.position.y = -1000.5;
    this.bottomFrontBox.position.z = -0.5;
    this.bottomFrontBox.actionManager = new BABYLON.ActionManager(this.babylonService.scene);
    this.bottomFrontBox.actionManager.registerAction(new BABYLON.SetValueAction(BABYLON.ActionManager.OnPointerOverTrigger, this.bottomFrontBox.material, "alpha", 0.5));
    this.bottomFrontBox.actionManager.registerAction(new BABYLON.SetValueAction(BABYLON.ActionManager.OnPointerOutTrigger, this.bottomFrontBox.material, "alpha", 0.0));
    this.bottomFrontBox.actionManager.registerAction(new BABYLON.Action(BABYLON.ActionManager.OnPickDownTrigger));
  }
  private createBottomBackBox() {

    this.bottomBackBox = BABYLON.MeshBuilder.CreateBox("bottomBack", { width: 0.6, height: 0.2, depth: 0.2 }, this.babylonService.scene);
    var materialBottomBack = new BABYLON.StandardMaterial("materialBottomBack", this.babylonService.scene);
    materialBottomBack.ambientColor = BABYLON.Color3.FromInts(117, 219, 255);
    materialBottomBack.alpha = 0.0;
    materialBottomBack.backFaceCulling = false;
    this.bottomBackBox.material = materialBottomBack;
    this.bottomBackBox.position.x = 0;
    this.bottomBackBox.position.y = -999.5;
    this.bottomBackBox.position.z = -0.5;
    this.bottomBackBox.actionManager = new BABYLON.ActionManager(this.babylonService.scene);
    this.bottomBackBox.actionManager.registerAction(new BABYLON.SetValueAction(BABYLON.ActionManager.OnPointerOverTrigger, this.bottomBackBox.material, "alpha", 0.5));
    this.bottomBackBox.actionManager.registerAction(new BABYLON.SetValueAction(BABYLON.ActionManager.OnPointerOutTrigger, this.bottomBackBox.material, "alpha", 0.0));
    this.bottomBackBox.actionManager.registerAction(new BABYLON.Action(BABYLON.ActionManager.OnPickDownTrigger));
  }
  private createBottomRightBox() {

    this.bottomRightBox = BABYLON.MeshBuilder.CreateBox("bottomRight", { width: 0.2, height: 0.6, depth: 0.2 }, this.babylonService.scene);
    var materialBottomRight = new BABYLON.StandardMaterial("materialBottomRight", this.babylonService.scene);
    materialBottomRight.ambientColor = BABYLON.Color3.FromInts(117, 219, 255);
    materialBottomRight.alpha = 0.0;
    materialBottomRight.backFaceCulling = false;
    this.bottomRightBox.material = materialBottomRight;
    this.bottomRightBox.position.x = 0.5;
    this.bottomRightBox.position.y = -1000;
    this.bottomRightBox.position.z = -0.5;
    this.bottomRightBox.actionManager = new BABYLON.ActionManager(this.babylonService.scene);
    this.bottomRightBox.actionManager.registerAction(new BABYLON.SetValueAction(BABYLON.ActionManager.OnPointerOverTrigger, this.bottomRightBox.material, "alpha", 0.5));
    this.bottomRightBox.actionManager.registerAction(new BABYLON.SetValueAction(BABYLON.ActionManager.OnPointerOutTrigger, this.bottomRightBox.material, "alpha", 0.0));
    this.bottomRightBox.actionManager.registerAction(new BABYLON.Action(BABYLON.ActionManager.OnPickDownTrigger));
  }
  private createBottomLeftBox() {

    this.bottomLeftBox = BABYLON.MeshBuilder.CreateBox("bottomLeft", { width: 0.2, height: 0.6, depth: 0.2 }, this.babylonService.scene);
    var materialBottomLeft = new BABYLON.StandardMaterial("materialBottomLeft", this.babylonService.scene);
    materialBottomLeft.ambientColor = BABYLON.Color3.FromInts(117, 219, 255);
    materialBottomLeft.alpha = 0.0;
    materialBottomLeft.backFaceCulling = false;
    this.bottomLeftBox.material = materialBottomLeft;
    this.bottomLeftBox.position.x = -0.5;
    this.bottomLeftBox.position.y = -1000;
    this.bottomLeftBox.position.z = -0.5;
    this.bottomLeftBox.actionManager = new BABYLON.ActionManager(this.babylonService.scene);
    this.bottomLeftBox.actionManager.registerAction(new BABYLON.SetValueAction(BABYLON.ActionManager.OnPointerOverTrigger, this.bottomLeftBox.material, "alpha", 0.5));
    this.bottomLeftBox.actionManager.registerAction(new BABYLON.SetValueAction(BABYLON.ActionManager.OnPointerOutTrigger, this.bottomLeftBox.material, "alpha", 0.0));
    this.bottomLeftBox.actionManager.registerAction(new BABYLON.Action(BABYLON.ActionManager.OnPickDownTrigger));
  }
  private createFrontRightBox() {

    this.frontRightBox = BABYLON.MeshBuilder.CreateBox("frontRight", { width: 0.2, height: 0.2, depth: 0.6 }, this.babylonService.scene);
    var materialFrontRight = new BABYLON.StandardMaterial("materialFrontRight", this.babylonService.scene);
    materialFrontRight.ambientColor = BABYLON.Color3.FromInts(117, 219, 255);
    materialFrontRight.alpha = 0.0;
    materialFrontRight.backFaceCulling = false;
    this.frontRightBox.material = materialFrontRight;
    this.frontRightBox.position.x = 0.5;
    this.frontRightBox.position.y = -1000.5;
    this.frontRightBox.position.z = 0;
    this.frontRightBox.actionManager = new BABYLON.ActionManager(this.babylonService.scene);
    this.frontRightBox.actionManager.registerAction(new BABYLON.SetValueAction(BABYLON.ActionManager.OnPointerOverTrigger, this.frontRightBox.material, "alpha", 0.5));
    this.frontRightBox.actionManager.registerAction(new BABYLON.SetValueAction(BABYLON.ActionManager.OnPointerOutTrigger, this.frontRightBox.material, "alpha", 0.0));
    this.frontRightBox.actionManager.registerAction(new BABYLON.Action(BABYLON.ActionManager.OnPickDownTrigger));
  }
  private createFrontLeftBox() {

    this.frontLeftBox = BABYLON.MeshBuilder.CreateBox("frontLeft", { width: 0.2, height: 0.2, depth: 0.6 }, this.babylonService.scene);
    var materialFrontLeft = new BABYLON.StandardMaterial("materialFrontLeft", this.babylonService.scene);
    materialFrontLeft.ambientColor = BABYLON.Color3.FromInts(117, 219, 255);
    materialFrontLeft.alpha = 0.0;
    materialFrontLeft.backFaceCulling = false;
    this.frontLeftBox.material = materialFrontLeft;
    this.frontLeftBox.position.x = -0.5;
    this.frontLeftBox.position.y = -1000.5;
    this.frontLeftBox.position.z = 0;
    this.frontLeftBox.actionManager = new BABYLON.ActionManager(this.babylonService.scene);
    this.frontLeftBox.actionManager.registerAction(new BABYLON.SetValueAction(BABYLON.ActionManager.OnPointerOverTrigger, this.frontLeftBox.material, "alpha", 0.5));
    this.frontLeftBox.actionManager.registerAction(new BABYLON.SetValueAction(BABYLON.ActionManager.OnPointerOutTrigger, this.frontLeftBox.material, "alpha", 0.0));
    this.frontLeftBox.actionManager.registerAction(new BABYLON.Action(BABYLON.ActionManager.OnPickDownTrigger));
  }
  private createBackRightBox() {

    this.backRightBox = BABYLON.MeshBuilder.CreateBox("backRight", { width: 0.2, height: 0.2, depth: 0.6 }, this.babylonService.scene);
    var materialBackRight = new BABYLON.StandardMaterial("materialBackRight", this.babylonService.scene);
    materialBackRight.ambientColor = BABYLON.Color3.FromInts(117, 219, 255);
    materialBackRight.alpha = 0.0;
    materialBackRight.backFaceCulling = false;
    this.backRightBox.material = materialBackRight;
    this.backRightBox.position.x = 0.5;
    this.backRightBox.position.y = -999.5;
    this.backRightBox.position.z = 0;
    this.backRightBox.actionManager = new BABYLON.ActionManager(this.babylonService.scene);
    this.backRightBox.actionManager.registerAction(new BABYLON.SetValueAction(BABYLON.ActionManager.OnPointerOverTrigger, this.backRightBox.material, "alpha", 0.5));
    this.backRightBox.actionManager.registerAction(new BABYLON.SetValueAction(BABYLON.ActionManager.OnPointerOutTrigger, this.backRightBox.material, "alpha", 0.0));
    this.backRightBox.actionManager.registerAction(new BABYLON.Action(BABYLON.ActionManager.OnPickDownTrigger));
  }
  private createBackLeftBox() {

    this.backLeftBox = BABYLON.MeshBuilder.CreateBox("backLeft", { width: 0.2, height: 0.2, depth: 0.6 }, this.babylonService.scene);
    var materialBackLeft = new BABYLON.StandardMaterial("materialBackLeft", this.babylonService.scene);
    materialBackLeft.ambientColor = BABYLON.Color3.FromInts(117, 219, 255);
    materialBackLeft.alpha = 0.0;
    materialBackLeft.backFaceCulling = false;
    this.backLeftBox.material = materialBackLeft;
    this.backLeftBox.position.x = -0.5;
    this.backLeftBox.position.y = -999.5;
    this.backLeftBox.position.z = 0;
    this.backLeftBox.actionManager = new BABYLON.ActionManager(this.babylonService.scene);
    this.backLeftBox.actionManager.registerAction(new BABYLON.SetValueAction(BABYLON.ActionManager.OnPointerOverTrigger, this.backLeftBox.material, "alpha", 0.5));
    this.backLeftBox.actionManager.registerAction(new BABYLON.SetValueAction(BABYLON.ActionManager.OnPointerOutTrigger, this.backLeftBox.material, "alpha", 0.0));
    this.backLeftBox.actionManager.registerAction(new BABYLON.Action(BABYLON.ActionManager.OnPickDownTrigger));
  }
}
