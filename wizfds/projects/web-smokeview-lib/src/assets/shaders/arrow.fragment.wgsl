varying vNormal : vec3<f32>;

@fragment
fn main(input : FragmentInputs) -> FragmentOutputs {
    let lightDirection = vec3<f32>(0.0, 0.0, -1.0); // Light from camera
    
    // Ambient lighting
    let ambient = 0.5;
    
    // Diffuse lighting
    let normalizedNormal = normalize(input.vNormal);
    let diffuse = max(dot(normalizedNormal, -lightDirection), 0.0) * 0.5;
    
    // Combine lighting
    let lighting = ambient + diffuse;
    
    // Red color for flow arrow
    let arrowColor = vec3<f32>(1.0, 0.0, 0.0);
    let finalColor = arrowColor * lighting;
    
    return FragmentOutputs(vec4<f32>(finalColor, 1.0));
}
