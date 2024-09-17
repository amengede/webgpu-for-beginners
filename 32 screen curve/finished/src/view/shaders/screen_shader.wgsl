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
    output.TexCoord = vec2<f32>(1, -1) * pos;
    return output;
}

@fragment
fn frag_main(@location(0) TexCoord : vec2<f32>) -> @location(0) vec4<f32> {

    var pos: vec2<f32> = vec2<f32>(
        TexCoord.x, 
        TexCoord.y + 0.2 * sin(TexCoord.y) * cos(TexCoord.x));

    // Normalize
    pos = vec2<f32>(0.5) * (vec2<f32>(1.0) + pos);

    if (pos.y > 1.0 || pos.y < 0.0) {
        discard;
    }

    return textureSample(color_buffer, screen_sampler, pos);
}