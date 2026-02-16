#include<__decl__>

#ifdef WEBGL2
precision highp float;
#endif

attribute vec3 position;
attribute vec3 normal;
attribute vec4 color;

uniform mat4 view;
uniform mat4 projection;
uniform mat4 world;
uniform mat4 worldView;

varying vec3 vcolor;
varying vec3 normalInterp;
varying vec3 vertPos;

void main() {
    vec4 vertPos4 = worldView * vec4(position, 1.0);
    vertPos = vertPos4.xyz / vertPos4.w;
    normalInterp = (view * vec4(normal, 0.0)).xyz;
    vcolor = color.rgb;
    gl_Position = projection * vertPos4;
}
