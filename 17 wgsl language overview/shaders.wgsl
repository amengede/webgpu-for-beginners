/*
    ---- WGSL Crash Course ----

    Source/Documentation: https://www.w3.org/TR/WGSL/

    There are two types of commands which can be executed by shaders:
    draw or dispatch commands. This is an example of a shader for a
    draw command.

*/

/*
    Definition of structs for bindings

    When you send data to a shader, it has meaning in the typescript
    file that sends it, but the shader also needs a declaration of how
    all those incoming bytes are meant to be read.

    To be safe, always work with vec4 and mat4x4, otherwise because of
    allignment WebGPU will add padding. For an example of this see the
    raytracing kernel
*/
struct TransformData {
    view: mat4x4<f32>,
    projection: mat4x4<f32>,
};

struct ObjectData {
    model: array<mat4x4<f32>>, //An array of arbitrary size. Totally fine,
                                //the only limitation is that each struct
                                //can only have one such array, and it has
                                //to the the last data member.
                                //The reason for this is that at the very least,
                                //a pointer to the start of a variable must
                                //be defined. if a float followed this array,
                                //we wouldn't know where to allocate memory for
                                //it, because we wouldn't know how much space
                                //the array takes up ahead of time.
};

/*
    Declaration of Bindings

    Here we have two binding groups, group 0 holds all the data
    which describes the scene and can be sent once, upfront.
    Whereas group 1 holds the description of an individual texture
    and will be rebound several times between shader execution.

    Variables with private, storage, uniform, workgroup and handle address
    spaces must only be declared at module scope, 
    whereas variables with function address space must only be declared at 
    function scope.
*/
@binding(0) @group(0) var<uniform> transformUBO: TransformData;
/*
    these angled brackets are used to specify more information needed
    to declare the variable, they can be used to specify the variable's
    address space, store type and access mode.
    here we specify that this variable is in uniform address space

    Address Spaces:
        function
        private
        workgroup
        uniform
        storage
        handle (for sampler and texture variables)
    
    Store Types:
        A basic interpretation of the underlying bytes.
        In other words, the type of the variable.
    
    Access Modes:
        Always has a default value and can only be changed
        for storage buffers.
        read
        write
        read_write
*/
@binding(1) @group(0) var<storage, read> objects: ObjectData;
@binding(0) @group(1) var myTexture: texture_2d<f32>;
/*
    Sampled texture types:
        texture_1d
        texture_2d
        texture_2d_array
        texture_3d
        texture_cube
        texture_cube_array
    
    pixel storage types:
        f32
        i32
        u32
*/
@binding(1) @group(1) var mySampler: sampler;
//Note here that I didn't specify var<handle>, genuine mistake on my
//part, but it states in the spec that handle and function address spaces
//do not need to be explicitly specified.

/*
    Intermediate Struct

    For shading purposes, we can imagine the following:

    vertex_shader => fragment_shader

    How does the vertex shader module send a lot of different data fields to the
    fragment shader module? The easiest way is to bundle them into a struct which 
    both shader modules understand.
*/
struct Fragment {
    @builtin(position) Position : vec4<f32>,
    /*
        Built-In Values:
            vertex_index: vertex input
            instance_index: vertex input
            position: vertex output, fragment input
            front_facing: fragment input
            frag_depth: fragment output
            local_invocation_id: compute input (3D location on work grid)
            local_invocation_id: compute input (linearised index of the id above)
            global_invocation_id: compute input (current invocation's position
                                                in the compute shader grid)
            workgroup_id: compute input
            ...
    */
    @location(0) TexCoord : vec2<f32>
};
/*
    Due to allignment, this struct might have some implicit padding, but
    since it's being semantically written to and read from the same
    module, the padding is not an issue.
*/

@vertex
fn vs_main(
    @builtin(instance_index) ID: u32,
    @location(0) vertexPostion: vec3<f32>, 
    @location(1) vertexTexCoord: vec2<f32>) -> Fragment {

    var output : Fragment;
    output.Position = transformUBO.projection * transformUBO.view * objects.model[ID] * vec4<f32>(vertexPostion, 1.0);
    output.TexCoord = vertexTexCoord;

    return output;
}

@fragment
fn fs_main(@location(0) TexCoord : vec2<f32>) -> @location(0) vec4<f32> {
    return textureSample(myTexture, mySampler, TexCoord);
}