#include<sceneUboDeclaration>
#include<meshUboDeclaration>

attribute position : vec3<f32>;
attribute normal : vec3<f32>;

// Added by Babylon as soon as the mesh has thin instances - see
// obstInstanced.vertex.wgsl for what each of them carries.
attribute world0 : vec4<f32>;
attribute world1 : vec4<f32>;
attribute world2 : vec4<f32>;
attribute world3 : vec4<f32>;
attribute instanceColor : vec4<f32>;

varying vColor : vec4<f32>;
varying vNormal : vec3<f32>;

@vertex
fn main(input : VertexInputs) -> FragmentInputs {
    let instanceWorld = mat4x4<f32>(
        vertexInputs.world0, vertexInputs.world1, vertexInputs.world2, vertexInputs.world3);
    vertexOutputs.position =
        scene.viewProjection * instanceWorld * vec4<f32>(vertexInputs.position, 1.0);
    vertexOutputs.vColor = vertexInputs.instanceColor;

    // Through the view alone: a &MESH box is axis-aligned and only scaled, so a
    // face normal is the same vector in object and in world space.
    vertexOutputs.vNormal = normalize((scene.view * vec4<f32>(vertexInputs.normal, 0.0)).xyz);
    return vertexOutputs;
}
