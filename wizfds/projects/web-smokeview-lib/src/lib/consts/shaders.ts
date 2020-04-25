export const shaders = {

    vertCode_slice_geom: `
        attribute vec3 position;
        uniform mat4 projectionMatrix; 
        uniform mat4 modelViewMatrix; 
        attribute float texture_coordinate;
        varying highp float vtexture_coordinate;
        void main(void) {
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            vtexture_coordinate = texture_coordinate;
        }`,

    fragCode_slice_geom: `
        precision mediump float;
        varying float vtexture_coordinate;
        uniform sampler2D texture_colorbar_sampler;
        void main(void) {
            gl_FragColor = texture2D(texture_colorbar_sampler, vec2(0.5, vtexture_coordinate));
        }`,

    vertCode_slice_node: 'attribute vec3 position;' +
        'uniform mat4 Pmatrix;' +
        'uniform mat4 Vmatrix;' +
        'uniform mat4 Mmatrix;' +
        'attribute float texture_coordinate;' +//the color of the point
        'varying highp float vtexture_coordinate;' +
        'void main(void) { ' +//pre-built function
        'gl_Position = Pmatrix*Vmatrix*Mmatrix*vec4(position, 1.);' +
        'vtexture_coordinate = texture_coordinate;' +
        '}',

    fragCode_slice_node: 'precision mediump float;' +
        'varying float vtexture_coordinate;' +
        'uniform sampler2D texture_colorbar_sampler;' +
        'void main(void) {' +
        'gl_FragColor = texture2D(texture_colorbar_sampler, vec2(0.5,vtexture_coordinate));' +
        '}',

    vertCode_slice_cell: 'attribute vec3 position;' +
        'uniform mat4 Pmatrix;' +
        'uniform mat4 Vmatrix;' +
        'uniform mat4 Mmatrix;' +
        'attribute float texture_coordinate;' +//the color of the point
        'varying highp float vtexture_coordinate;' +
        'void main(void) { ' +//pre-built function
        'gl_Position = Pmatrix*Vmatrix*Mmatrix*vec4(position, 1.);' +
        'vtexture_coordinate = texture_coordinate;' +
        '}',

    fragCode_slice_cell: 'precision mediump float;' +
        'varying float vtexture_coordinate;' +
        'uniform sampler2D texture_colorbar_sampler;' +
        'void main(void) {' +
        'gl_FragColor = texture2D(texture_colorbar_sampler, vec2(0.5,vtexture_coordinate));' +
        '}',

};