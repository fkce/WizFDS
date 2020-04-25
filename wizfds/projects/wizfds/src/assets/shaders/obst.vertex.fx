precision highp float;

attribute vec3 position; 
attribute vec3 normal;
attribute vec3 color;
// Uniforms
uniform mat4 view;
uniform mat4 projection;
uniform mat4 world;
uniform mat4 worldView;
uniform mat4 worldViewProjection;
// Varying
varying vec3 vcolor;
varying vec3 normalInterp;
varying vec3 vertPos;
// Clipping
varying vec4 worldPosition;

void main(void) {
    //Clipping
    worldPosition = world * vec4( position, 1.0 );

    vec4 vertPos4 = worldView * vec4(position, 1.0);
    vertPos = vec3(vertPos4) / vertPos4.w;
    normalInterp = vec3(view * vec4(normal, 0.0));
    vcolor = color;
    gl_Position = projection * vertPos4;
}