struct VertexOutput {
    @builtin(position) Position : vec4<f32>,
    @location(0) TexCoord : vec2<f32>,
};

@group(0) @binding(0) var color_buffer : texture_2d<f32>;
@group(0) @binding(1) var screen_sampler : sampler;

@vertex
fn vert_main(@builtin(vertex_index) VertexIndex : u32) -> VertexOutput {

    var positions = array<vec2<f32>, 6>(
        vec2<f32>( 1.0,  1.0),
        vec2<f32>( 1.0, -1.0),
        vec2<f32>(-1.0, -1.0),
        vec2<f32>( 1.0,  1.0),
        vec2<f32>(-1.0, -1.0),
        vec2<f32>(-1.0,  1.0)
    );

    var pos: vec2<f32> = positions[VertexIndex];

    var output : VertexOutput;
    output.Position = vec4<f32>(pos, 0.0, 1.0);
    output.TexCoord = vec2<f32>(0.5, -0.5) * (vec2<f32>(1.0) + pos);
    return output;
}

@fragment
fn frag_main(@location(0) TexCoord : vec2<f32>) -> @location(0) vec4<f32> {

    var color: vec4<f32> =  textureSample(color_buffer, screen_sampler, TexCoord);

    if (color.a < 0.5) {
        discard;
    }
    
    var intensity: f32 = (1.0f / 3.0f) * (color.r + color.g + color.b);
    var purple: vec3<f32> = intensity * vec3<f32>(176.0 / 255.0, 105.0 / 255.0, 219.0 / 255.0);
    return vec4<f32>(purple, 1.0);
}