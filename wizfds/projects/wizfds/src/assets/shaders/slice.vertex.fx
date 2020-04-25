precision highp float;
// Atribute
attribute vec3 position;
//the color of the point
attribute float texture_coordinate;

attribute float blank;

// Uniform
uniform mat4 worldViewProjection;

// Varying
varying highp float vtexture_coordinate;
varying highp float vblank;

void main(void) {

    gl_Position = worldViewProjection * vec4(position, 1.0);
    vtexture_coordinate = texture_coordinate;
    vblank = blank;
}