precision highp float;

attribute vec3 position; 
attribute vec3 normal;
// Uniforms
uniform mat4 view;
uniform mat4 projection;
uniform mat4 world;
uniform mat4 worldView;
uniform mat4 worldViewProjection;
// Clipping
varying vec4 worldPosition;

void main(void) {
    //Clipping
    worldPosition = world * vec4(position, 1.0);

    vec4 vertPos4 = worldView * vec4(position, 1.0);
    gl_Position = projection * vertPos4;
}