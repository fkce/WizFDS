varying vPositionW : vec3<f32>;
varying vColor : vec4<f32>;
varying vNormal : vec3<f32>;

uniform clipX: f32;
uniform clipY: f32;
uniform clipZ: f32;

@fragment
fn main(input : FragmentInputs) -> FragmentOutputs {
    // A world position in metres, because that is what the planes are (ADR-0002).
    // Shared with obstInstanced.vertex, which works the same one out from its
    // per-instance matrix rather than from the mesh's.
    let p = input.vPositionW;
    if (p.x <= uniforms.clipX || p.y <= uniforms.clipY || p.z >= uniforms.clipZ) {
        discard;
    }
    
    // Light direction in view space - pointing towards camera
    let lightDirection = vec3<f32>(0.0, 0.0, -1.0);
    let normal = normalize(input.vNormal);
    let diffuse = max(dot(normal, lightDirection), 0.0);
    
    // Balanced lighting - higher ambient, moderate diffuse
    let ambient = 0.5;
    let lightIntensity = ambient + diffuse * 0.5;
    
    let finalColor = input.vColor.rgb * lightIntensity;
    return FragmentOutputs(vec4<f32>(finalColor, input.vColor.a));
}
