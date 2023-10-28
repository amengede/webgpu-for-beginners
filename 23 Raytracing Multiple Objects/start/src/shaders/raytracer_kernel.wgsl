struct Sphere {
    center: vec3<f32>,
    color: vec3<f32>,
    radius: f32,
}

struct Triangle {
    corner_a: vec3<f32>,
    //float
    normal_a: vec3<f32>,
    //float
    corner_b: vec3<f32>,
    //float
    normal_b: vec3<f32>,
    //float
    corner_c: vec3<f32>,
    //float
    normal_c: vec3<f32>,
    //float
    color: vec3<f32>,
    //float
}

struct ObjectData {
    triangles: array<Triangle>,
}

struct Node {
    minCorner: vec3<f32>,
    leftChild: f32,
    maxCorner: vec3<f32>,
    primitiveCount: f32,
}

//TODO: make a struct to describe a bottom level acceleration structure (blas)
//      we'll need both an inverse model matrix to describe any transform
//      and an index into the root node of the BVH

//TODO: Now add an array of blas descriptions
struct BVH {
    nodes: array<Node>,
}

struct ObjectIndices {
    primitiveIndices: array<f32>,
}

struct Ray {
    direction: vec3<f32>,
    origin: vec3<f32>,
}

//TODO: Remove the inverseModel, and while we're at it, pimitiveCount
struct SceneData {
    cameraPos: vec3<f32>,
    cameraForwards: vec3<f32>,
    cameraRight: vec3<f32>,
    maxBounces: f32,
    cameraUp: vec3<f32>,
    primitiveCount: f32,
    inverseModel: mat4x4<f32>,
}

//TODO: Remove the position field,
struct RenderState {
    t: f32,
    color: vec3<f32>,
    hit: bool,
    position: vec3<f32>,
    normal: vec3<f32>,
}

//TODO: Add a bottom level BVH,
//  add another storage buffer to track bottom level bvh lookup
@group(0) @binding(0) var color_buffer: texture_storage_2d<rgba8unorm, write>;
@group(0) @binding(1) var<uniform> scene: SceneData;
@group(0) @binding(2) var<storage, read> objects: ObjectData;
@group(0) @binding(3) var<storage, read> tree: BVH;
@group(0) @binding(4) var<storage, read> triangleLookup: ObjectIndices;
@group(0) @binding(5) var skyTexture: texture_cube<f32>;
@group(0) @binding(6) var skySampler: sampler;

@compute @workgroup_size(1,1,1)
fn main(@builtin(global_invocation_id) GlobalInvocationID : vec3<u32>) {

    let screen_size: vec2<i32> = vec2<i32>(textureDimensions(color_buffer));
    let screen_pos : vec2<i32> = vec2<i32>(i32(GlobalInvocationID.x), i32(GlobalInvocationID.y));

    let horizontal_coefficient: f32 = (f32(screen_pos.x) - f32(screen_size.x) / 2) / f32(screen_size.x);
    let vertical_coefficient: f32 = (f32(screen_pos.y) - f32(screen_size.y) / 2) / f32(screen_size.x);

    let forwards: vec3<f32> = scene.cameraForwards;
    let right: vec3<f32> = scene.cameraRight;
    let up: vec3<f32> = scene.cameraUp;

    var myRay: Ray;
    myRay.direction = normalize(forwards + horizontal_coefficient * right + vertical_coefficient * up);
    myRay.origin = scene.cameraPos;

    let pixel_color : vec3<f32> = rayColor(myRay);

    textureStore(color_buffer, screen_pos, vec4<f32>(pixel_color, 1.0));
}

fn rayColor(ray: Ray) -> vec3<f32> {

    var color: vec3<f32> = vec3(1.0, 1.0, 1.0);
    var result: RenderState;

    var world_ray: Ray;
    world_ray.origin = ray.origin;
    world_ray.direction = ray.direction;

    //TODO: Remove the object ray (since the TLAS has no transform),
    var object_ray: Ray;
    object_ray.origin = (scene.inverseModel * vec4<f32>(ray.origin, 1.0)).xyz;
    object_ray.direction = (scene.inverseModel * vec4<f32>(ray.direction, 0.0)).xyz;

    let bounces: u32 = u32(scene.maxBounces);
    for(var bounce: u32 = 0; bounce < bounces; bounce++) {

        //TODO: Call top level trace function.
        result = trace(object_ray);

        if (!result.hit) {
            //sky color
            color = color * textureSampleLevel(skyTexture, skySampler, world_ray.direction, 0.0).xyz;
            break;
        }

        //unpack color
        color = color * result.color;

        //Set up for next trace
        world_ray.origin = world_ray.origin + result.t * world_ray.direction;
        world_ray.direction = normalize(reflect(world_ray.direction, result.normal));

        object_ray.origin = (scene.inverseModel * vec4<f32>(world_ray.origin, 1.0)).xyz;
        object_ray.direction = (scene.inverseModel * vec4<f32>(world_ray.direction, 0.0)).xyz;
    }

    //Rays which reached terminal state and bounced indefinitely
    if (result.hit) {
        color = vec3(0.0, 0.0, 0.0);
    }

    return color;
}

fn trace_tlas(ray: Ray) -> RenderState {

    //Set up the Render State
    var renderState: RenderState;
    renderState.hit = false;
    //TODO: Store this in renderstate.t
    var nearestHit: f32 = 9999;

    //Set up for BVH Traversal
    //TODO: set this to the root node of the tlas
    var node: Node = tree.nodes[0];
    var stack: array<Node, 20>;
    var stackLocation: u32 = 0;

    while (true) {

        var primitiveCount: u32 = u32(node.primitiveCount);
        var contents: u32 = u32(node.leftChild);

        if (primitiveCount == 0) {
            var child1: Node = tree.nodes[contents];
            var child2: Node = tree.nodes[contents + 1];

            var distance1: f32 = hit_aabb(ray, child1);
            var distance2: f32 = hit_aabb(ray, child2);
            if (distance1 > distance2) {
                var tempDist: f32 = distance1;
                distance1 = distance2;
                distance2 = tempDist;

                var tempChild: Node = child1;
                child1 = child2;
                child2 = tempChild;
            }

            //TODO: check with the renderstate's nearest hit
            if (distance1 > nearestHit) {
                if (stackLocation == 0) {
                    break;
                }
                else {
                    stackLocation -= 1;
                    node = stack[stackLocation];
                }
            }
            else {
                node = child1;
                //TODO: check with the renderstate's nearest hit
                if (distance2 < nearestHit) {
                    stack[stackLocation] = child2;
                    stackLocation += 1;
                }
            }
        }
        else {
            for (var i: u32 = 0; i < primitiveCount; i++) {
                
                //TODO: trace the underlying blas here
                //      remember to fetch the appropriate blas description!
                var newRenderState: RenderState = hit_triangle(
                    ray, 
                    objects.triangles[u32(triangleLookup.primitiveIndices[i + contents])], 
                    0.001, nearestHit, renderState
                );

                if (newRenderState.hit) {
                    //TODO: remove this line, this can be updated within
                    //      hit functions.
                    nearestHit = newRenderState.t;
                    renderState = newRenderState;
                }
            }

            if (stackLocation == 0) {
                break;
            }
            else {
                stackLocation -= 1;
                node = stack[stackLocation];
            }
        }
    }

    return renderState;
}

//TODO: give this function the following additional arguments:
//      blasDescription
//      renderState
fn trace_blas(ray: Ray) -> RenderState {

    //TODO: Set up an object ray 
    //  (no world ray needed as reflections are being handled in rayColor)

    //TODO: Make a copy of the renderstate argument
    //      so it can be modified by this function
    //      set hit to false, since this is the first tracing function
    //      which actually gets down to raw triangles
    var renderState: RenderState;
    renderState.hit = false;
    var nearestHit: f32 = 9999;

    //TODO: Fetch the root node according to the blas description
    var node: Node = tree.nodes[0];
    var stack: array<Node, 15>;
    var stackLocation: u32 = 0;

    while (true) {

        var primitiveCount: u32 = u32(node.primitiveCount);
        var contents: u32 = u32(node.leftChild);

        if (primitiveCount == 0) {
            var child1: Node = tree.nodes[contents];
            var child2: Node = tree.nodes[contents + 1];

            var distance1: f32 = hit_aabb(ray, child1);
            var distance2: f32 = hit_aabb(ray, child2);
            if (distance1 > distance2) {
                var tempDist: f32 = distance1;
                distance1 = distance2;
                distance2 = tempDist;

                var tempChild: Node = child1;
                child1 = child2;
                child2 = tempChild;
            }
            //TODO: read t from renderState
            if (distance1 > nearestHit) {
                if (stackLocation == 0) {
                    break;
                }
                else {
                    stackLocation -= 1;
                    node = stack[stackLocation];
                }
            }
            else {
                node = child1;
                //TODO: read t from renderState
                if (distance2 < nearestHit) {
                    stack[stackLocation] = child2;
                    stackLocation += 1;
                }
            }
        }
        else {
            for (var i: u32 = 0; i < primitiveCount; i++) {

                //TODO: Remove nearestHit
                var newRenderState: RenderState = hit_triangle(
                    ray, 
                    objects.triangles[u32(triangleLookup.primitiveIndices[i + contents])], 
                    0.001, nearestHit, renderState
                );

                //TODO: Again, don't need to set nearestHit here
                if (newRenderState.hit) {
                    nearestHit = newRenderState.t;
                    renderState = newRenderState;
                }
            }

            if (stackLocation == 0) {
                break;
            }
            else {
                stackLocation -= 1;
                node = stack[stackLocation];
            }
        }
    }

    return renderState;
}

//TODO: remove tMax
fn hit_sphere(ray: Ray, sphere: Sphere, tMin: f32, tMax: f32, oldRenderState: RenderState) -> RenderState {
    
    let co: vec3<f32> = ray.origin - sphere.center;
    let a: f32 = dot(ray.direction, ray.direction);
    let b: f32 = 2.0 * dot(ray.direction, co);
    let c: f32 = dot(co, co) - sphere.radius * sphere.radius;
    let discriminant: f32 = b * b - 4.0 * a * c;

    var renderState: RenderState;
    renderState.color = oldRenderState.color;

    if (discriminant > 0.0) {

        let t: f32 = (-b - sqrt(discriminant)) / (2 * a);

        //TODO: read oldRenderState.nearestHit
        if (t > tMin && t < tMax) {
            //TODO: Don't set position
            renderState.position = ray.origin + t * ray.direction;
            //TODO: set renderState nearestHit
            //TODO: remove this line for now (it'll make problems)
            renderState.normal = normalize(renderState.position - sphere.center);
            renderState.t = t;
            renderState.color = sphere.color;
            renderState.hit = true;
            return renderState;
        }
    }

    renderState.hit = false;
    return renderState;
    
}

//TODO: remove tMax
fn hit_triangle(ray: Ray, tri: Triangle, tMin: f32, oldRenderState: RenderState) -> RenderState {

    var renderState: RenderState;
    renderState.color = oldRenderState.color;
    renderState.hit = false;

    //Direction vectors
    let edge_ab: vec3<f32> = tri.corner_b - tri.corner_a;
    let edge_ac: vec3<f32> = tri.corner_c - tri.corner_a;
    //Normal of the triangle
    var n: vec3<f32> = normalize(cross(edge_ab, edge_ac));
    var ray_dot_tri: f32 = dot(ray.direction, n);
    //backface reversal
    if (ray_dot_tri > 0.0) {
        ray_dot_tri = ray_dot_tri * -1;
        n = n * -1;
    }
    //early exit, ray parallel with triangle surface
    if (abs(ray_dot_tri) < 0.00001) {
        return renderState;
    }

    var system_matrix: mat3x3<f32> = mat3x3<f32>(
        ray.direction,
        tri.corner_a - tri.corner_b,
        tri.corner_a - tri.corner_c
    );
    let denominator: f32 = determinant(system_matrix);
    if (abs(denominator) < 0.00001) {
        return renderState;
    }

    system_matrix = mat3x3<f32>(
        ray.direction,
        tri.corner_a - ray.origin,
        tri.corner_a - tri.corner_c
    );
    let u: f32 = determinant(system_matrix) / denominator;
    
    if (u < 0.0 || u > 1.0) {
        return renderState;
    }

    system_matrix = mat3x3<f32>(
        ray.direction,
        tri.corner_a - tri.corner_b,
        tri.corner_a - ray.origin,
    );
    let v: f32 = determinant(system_matrix) / denominator;
    if (v < 0.0 || u + v > 1.0) {
        return renderState;
    }

    system_matrix = mat3x3<f32>(
        tri.corner_a - ray.origin,
        tri.corner_a - tri.corner_b,
        tri.corner_a - tri.corner_c
    );
    let t: f32 = determinant(system_matrix) / denominator;

    //TODO: read oldRenderState.t
    if (t > tMin && t < tMax) {
        //TODO: Don't set position
        renderState.position = ray.origin + t * ray.direction;
        let normal: vec3<f32> = (1.0 - u - v) * tri.normal_a + u * tri.normal_b + v * tri.normal_c;
        renderState.normal = normalize((transpose(scene.inverseModel) * vec4(normal, 0.0)).xyz);
        renderState.color = tri.color;
        renderState.t = t;
        renderState.hit = true;
        return renderState;
    }

    return renderState;
}

fn hit_aabb(ray: Ray, node: Node) -> f32 {

    var inverseDir: vec3<f32> = vec3(1.0) / ray.direction;
    var t1: vec3<f32> = (node.minCorner - ray.origin) * inverseDir;
    var t2: vec3<f32> = (node.maxCorner - ray.origin) * inverseDir;
    var tMin: vec3<f32> = min(t1, t2);
    var tMax: vec3<f32> = max(t1, t2);

    var t_min: f32 = max(max(tMin.x, tMin.y), tMin.z);
    var t_max: f32 = min(min(tMax.x, tMax.y), tMax.z);

    if (t_min > t_max || t_max < 0) {
        return 99999;
    }
    else {
        return t_min;
    }
}