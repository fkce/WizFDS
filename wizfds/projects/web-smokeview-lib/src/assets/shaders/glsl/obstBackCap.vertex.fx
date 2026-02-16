#include<__decl__>

#ifdef WEBGL2
precision highp float;
#endif

attribute vec3 position;
attribute vec3 normal;

uniform mat4 view;
uniform mat4 projection;
uniform mat4 world;
uniform mat4 worldView;

varying vec4 worldPosition;

void main() {
    worldPosition = world * vec4(position, 1.0);
    vec4 vertPos4 = worldView * vec4(position, 1.0);
    gl_Position = projection * vertPos4;
}
