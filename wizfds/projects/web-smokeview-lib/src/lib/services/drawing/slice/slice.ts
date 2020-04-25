import { colorbars as Colorbars } from '../../../consts/colorbars';
import * as BABYLON from 'babylonjs';
import { toInteger } from 'lodash';

export class Slice {

    mesh: BABYLON.Mesh;
    material: BABYLON.ShaderMaterial;

    // Color index for each vertex
    tex: Float32Array;
    texData: Float32Array;
    frameSize: number;

    isBlank: number = 1;

    /**
     * Create Slice class
     * @param vertices 
     * @param indices 
     * @param blank 
     * @param texData 
     * @param scene 
     * @param frameSize 
     */
    constructor(
        vertices: Float32Array,
        indices: Int32Array,
        blank: Float32Array,
        texData: Float32Array,
        scene: BABYLON.Scene,
        frameCur: number = 0
    ) {

        // Create new custom mesh and vertex data
        this.mesh = new BABYLON.Mesh("custom", scene);
        let vertexData = new BABYLON.VertexData();
        this.texData = texData;

        // Compute normals
        let normals = new Float32Array();
        BABYLON.VertexData.ComputeNormals(vertices, indices, normals);

        // Assign data
        vertexData.positions = vertices;
        vertexData.indices = indices;
        vertexData.normals = normals;
        vertexData.applyToMesh(this.mesh, true);

        // Add colors to vertices
        this.frameSize = toInteger(vertices.length / 3);
        this.tex = this.texData.slice(frameCur * this.frameSize, (frameCur + 1) * this.frameSize);

        this.mesh.setVerticesData('texture_coordinate', this.tex, true, 1);

        // Add colors to vertices
        this.mesh.setVerticesData('blank', blank, true, 1);

        // Create material with shaders
        this.material = new BABYLON.ShaderMaterial('shader', scene, '/assets/slice',
            {
                attributes: ['position', 'color', 'normal', 'texture_coordinate', 'blank'],
                uniforms: ['world', 'worldView', 'worldViewProjection', 'view', 'projection']
            });

        this.material.setInt('is_blank', this.isBlank);
        this.material.backFaceCulling = false;
        this.material.zOffset = 0.2;

        // Create RawTexture to sample the colors in fragment shaders
        let texture_colorbar = new BABYLON.RawTexture(Colorbars.rainbow.colors, 1, Colorbars.rainbow.number, BABYLON.Engine.TEXTUREFORMAT_RGBA, scene, false, false, BABYLON.Texture.LINEAR_LINEAR, BABYLON.Engine.TEXTURETYPE_UNSIGNED_BYTE);

        texture_colorbar.wrapR = BABYLON.Texture.CLAMP_ADDRESSMODE;
        texture_colorbar.wrapU = BABYLON.Texture.CLAMP_ADDRESSMODE;

        this.material.setTexture('texture_colorbar_sampler', texture_colorbar);
        this.mesh.material = this.material;
    }

    /**
     * Set color texture data from texData
     * @param frameCur current frame
     */
    public setTex(frameCur: number) {
        this.tex = this.texData.slice(frameCur * this.frameSize, (frameCur + 1) * this.frameSize);
        this.mesh.setVerticesData("texture_coordinate", this.tex, true, 1);
    }

    /**
     * Toogle blank triangles 
     */
    public toogleBlank() {
        this.isBlank = this.isBlank == 0 ? 1 : 0;
        this.material.setInt('is_blank', this.isBlank);
    }

}