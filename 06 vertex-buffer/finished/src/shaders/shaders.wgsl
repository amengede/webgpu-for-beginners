struct Fragment {
    @builtin(position) Position : vec4<f32>,
    @location(0) Color : vec4<f32>
};

@vertex
fn vs_main(@location(0) vertexPostion: vec2<f32>, @location(1) vertexColor: vec3<f32>) -> Fragment {

    var output : Fragment;
    output.Position = vec4<f32>(vertexPostion, 0.0, 1.0);
    output.Color = vec4<f32>(vertexColor, 1.0);

    return output;
}

@fragment
fn fs_main(@location(0) Color: vec4<f32>) -> @location(0) vec4<f32> {
    return Color;
}