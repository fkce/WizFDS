attribute vec3 position;
attribute vec3 normal;
attribute vec4 color;

uniform mat4 world;
uniform mat4 view;
uniform mat4 viewProjection;

varying vec4 vColor;
varying vec3 vNormal;
varying float valpha;

void main() {
    vec4 worldPos = world * vec4(position, 1.0);
    gl_Position = viewProjection * worldPos;
    
    // Pass color with alpha channel for transparency
    vColor = color;
    valpha = color.a;
    
    // Transform normal to view space for lighting
    vec3 worldNormal = normalize((world * vec4(normal, 0.0)).xyz);
    vNormal = normalize((view * vec4(worldNormal, 0.0)).xyz);
}
