precision highp float;

varying vec3 vNormal;

void main() {
    vec3 lightDirection = vec3(0.0, 0.0, -1.0); // Light from camera
    
    // Ambient lighting
    float ambient = 0.5;
    
    // Diffuse lighting
    vec3 normalizedNormal = normalize(vNormal);
    float diffuse = max(dot(normalizedNormal, -lightDirection), 0.0) * 0.5;
    
    // Combine lighting
    float lighting = ambient + diffuse;
    
    // Red color for flow arrow
    vec3 arrowColor = vec3(1.0, 0.0, 0.0);
    vec3 finalColor = arrowColor * lighting;
    
    gl_FragColor = vec4(finalColor, 1.0);
}
