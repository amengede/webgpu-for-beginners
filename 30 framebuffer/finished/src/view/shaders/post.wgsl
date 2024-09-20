@binding(0) @group(0) var myTexture: texture_2d<f32>;
@binding(1) @group(0) var mySampler: sampler;

struct Fragment {
    @builtin(position) Position : vec4<f32>,
    @location(0) TexCoord : vec2<f32>
};

@vertex
fn vs_main(@builtin(vertex_index) VertexIndex: u32) -> Fragment {

    var positions = array<vec2<f32>, 6>(
        vec2<f32>( 1.0,  1.0),
        vec2<f32>( 1.0, -1.0),
        vec2<f32>(-1.0, -1.0),
        vec2<f32>( 1.0,  1.0),
        vec2<f32>(-1.0, -1.0),
        vec2<f32>(-1.0,  1.0),
    );

    var output : Fragment;

    var pos: vec2<f32> = positions[VertexIndex];
    output.Position = vec4<f32>(pos, 0.0, 1.0);
    output.TexCoord = vec2<f32>(0.5, -0.5) * (pos + vec2(1.0));

    return output;
}

@fragment
fn fs_main(@location(0) TexCoord : vec2<f32>) -> @location(0) vec4<f32> {

    var color: vec4<f32> =  textureSample(myTexture, mySampler, TexCoord);
    var intensity: f32 = (1.0f / 3.0f) * (color.r + color.g + color.b);
    var purple: vec3<f32> = intensity * vec3<f32>(176.0 / 255.0, 105.0 / 255.0, 219.0 / 255.0);
    return vec4<f32>(purple, 1.0);
}