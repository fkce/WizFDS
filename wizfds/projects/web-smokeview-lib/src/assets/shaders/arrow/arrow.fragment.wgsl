#include<sceneUboDeclaration>

varying vNormal: vec3f;

@fragment
fn main(input: FragmentInputs) -> FragmentOutputs {
    var lightDirection: vec3f = vec3f(0.0, 0.0, -1.0); // Light from camera
    
    // Ambient lighting
    var ambient: f32 = 0.5;
    
    // Diffuse lighting
    var normalizedNormal: vec3f = normalize(input.vNormal);
    var diffuse: f32 = max(dot(normalizedNormal, -lightDirection), 0.0) * 0.5;
    
    // Combine lighting
    var lighting: f32 = ambient + diffuse;
    
    // Red color for flow arrow
    var arrowColor: vec3f = vec3f(1.0, 0.0, 0.0);
    var finalColor: vec3f = arrowColor * lighting;
    
    fragmentOutputs.color = vec4f(finalColor, 1.0);
}
