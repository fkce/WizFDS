precision highp float;
varying vec3 vcolor;
varying float valpha;
varying vec3 normalInterp;
varying vec3 vertPos;
// Clipping
varying vec4 worldPosition;
uniform float clipX;
uniform float clipY;
uniform float clipZ;

void main() {
    vec3 N = normalize(normalInterp);
    // Light direction in view space - points towards camera
    vec3 L = vec3(0.0, 0.0, -1.0);
    float lambertian = max(dot(N, L), 0.0);
    
    // Clipping
    if (worldPosition.x <= clipX || worldPosition.y <= clipY || worldPosition.z >= clipZ) discard;

    // Balanced lighting - higher ambient, moderate diffuse
    float ambient = 0.5;
    float lightIntensity = ambient + lambertian * 0.5;
    
    gl_FragColor = vec4(vcolor * lightIntensity, valpha);
}
