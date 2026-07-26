varying vPositionOS : vec3<f32>;
varying vColor : vec4<f32>;
varying vNormal : vec3<f32>;

uniform clipX: f32;
uniform clipY: f32;
uniform clipZ: f32;
uniform transparent: f32;

@fragment
fn main(input : FragmentInputs) -> FragmentOutputs {
    let p = input.vPositionOS;
    if (p.x <= uniforms.clipX || p.y <= uniforms.clipY || p.z >= uniforms.clipZ) {
        discard;
    }

    let lightDirection = vec3<f32>(0.0, 0.0, -1.0);
    let ambient = 0.5;
    let normalizedNormal = normalize(input.vNormal);
    let diffuse = max(dot(normalizedNormal, -lightDirection), 0.0) * 0.5;
    let lighting = ambient + diffuse;

    let finalColor = input.vColor.rgb * lighting;
    return FragmentOutputs(vec4<f32>(finalColor, uniforms.transparent));
}
