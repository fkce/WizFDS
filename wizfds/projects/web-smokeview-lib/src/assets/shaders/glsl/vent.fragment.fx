precision highp float;

varying vec4 vColor;
varying vec3 vNormal;
varying float valpha;

void main() {
    vec3 lightDirection = vec3(0.0, 0.0, -1.0); // Light from camera
    vec3 lightColor = vec3(1.0, 1.0, 1.0);
    
    // Ambient lighting
    float ambient = 0.5;
    
    // Diffuse lighting
    vec3 normalizedNormal = normalize(vNormal);
    float diffuse = max(dot(normalizedNormal, -lightDirection), 0.0) * 0.5;
    
    // Combine lighting
    float lighting = ambient + diffuse;
    
    // Apply lighting to color while preserving alpha
    vec3 finalColor = vColor.rgb * lighting;
    
    gl_FragColor = vec4(finalColor, valpha);
}
