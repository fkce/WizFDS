#include<__decl__>

#ifdef WEBGL2
precision highp float;
#endif

attribute vec3 position;
attribute float texture_coordinate;
attribute float blank;

uniform mat4 worldViewProjection;

varying float vtexture_coordinate;
varying float vblank;

void main(){
    gl_Position = worldViewProjection * vec4(position, 1.0);
    vtexture_coordinate = texture_coordinate;
    vblank = blank;
}
