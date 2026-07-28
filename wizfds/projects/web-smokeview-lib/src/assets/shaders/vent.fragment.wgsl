varying vPositionOS : vec3<f32>;
varying vColor : vec4<f32>;
varying vNormal : vec3<f32>;

uniform clipX: f32;
uniform clipY: f32;
uniform clipZ: f32;

@fragment
fn main(input : FragmentInputs) -> FragmentOutputs {
    // The same test the obst and fire shaders make, in the same coordinates: a
    // plane dragged through the model has to cut the planes drawn for a jetfan
    // along with the body they belong to.
    let p = input.vPositionOS;
    if (p.x <= uniforms.clipX || p.y <= uniforms.clipY || p.z >= uniforms.clipZ) {
        discard;
    }

    let lightDirection = vec3<f32>(0.0, 0.0, -1.0); // Light from camera

    // Ambient lighting
    let ambient = 0.5;

    // Diffuse lighting
    let normalizedNormal = normalize(input.vNormal);
    let diffuse = max(dot(normalizedNormal, -lightDirection), 0.0) * 0.5;

    // Combine lighting
    let lighting = ambient + diffuse;

    // Apply lighting to color while preserving alpha - unlike a fire, a derived
    // vent's transparency is the one the jetfan service gave it, per vertex
    let finalColor = input.vColor.rgb * lighting;

    return FragmentOutputs(vec4<f32>(finalColor, input.vColor.a));
}
