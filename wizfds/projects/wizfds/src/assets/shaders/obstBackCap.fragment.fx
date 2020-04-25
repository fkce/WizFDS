precision highp float;

// Clipping
varying vec4 worldPosition;
uniform float clipX;
uniform float clipY;
uniform float clipZ;

void main() {
    // Clipping
    if (worldPosition.x <= clipX || worldPosition.y <= clipY || worldPosition.z >= clipZ) discard;
    gl_FragColor = vec4(1.0, 0.0, 0.0, 1.0);
}