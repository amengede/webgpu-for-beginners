(()=>{"use strict";class e{constructor(e,r,n){this.center=new Float32Array(e),this.radius=r,this.color=new Float32Array(n)}}var r,n="undefined"!=typeof Float32Array?Float32Array:Array;function t(e,r,n){return e[0]=r[0]+n[0],e[1]=r[1]+n[1],e[2]=r[2]+n[2],e}function i(e,r,n){return e[0]=r[0]-n[0],e[1]=r[1]-n[1],e[2]=r[2]-n[2],e}function s(e,r,n){return e[0]=Math.min(r[0],n[0]),e[1]=Math.min(r[1],n[1]),e[2]=Math.min(r[2],n[2]),e}function a(e,r,n){return e[0]=Math.max(r[0],n[0]),e[1]=Math.max(r[1],n[1]),e[2]=Math.max(r[2],n[2]),e}function o(e,r,n){var t=r[0],i=r[1],s=r[2],a=n[0],o=n[1],c=n[2];return e[0]=i*c-s*o,e[1]=s*a-t*c,e[2]=t*o-i*a,e}Math.random,Math.PI,Math.hypot||(Math.hypot=function(){for(var e=0,r=arguments.length;r--;)e+=arguments[r]*arguments[r];return Math.sqrt(e)}),r=new n(3),n!=Float32Array&&(r[0]=0,r[1]=0,r[2]=0);class c{constructor(e){this.position=new Float32Array(e),this.theta=0,this.phi=0,this.recalculate_vectors()}recalculate_vectors(){this.forwards=new Float32Array([Math.cos(180*this.theta/Math.PI)*Math.cos(180*this.phi/Math.PI),Math.sin(180*this.theta/Math.PI)*Math.cos(180*this.phi/Math.PI),Math.sin(180*this.phi/Math.PI)]),this.right=new Float32Array([0,0,0]),o(this.right,this.forwards,[0,0,1]),this.up=new Float32Array([0,0,0]),o(this.up,this.right,this.forwards)}}class h{}const d="@group(0) @binding(0) var screen_sampler : sampler;\r\n@group(0) @binding(1) var color_buffer : texture_2d<f32>;\r\n\r\nstruct VertexOutput {\r\n    @builtin(position) Position : vec4<f32>,\r\n    @location(0) TexCoord : vec2<f32>,\r\n}\r\n\r\n@vertex\r\nfn vert_main(@builtin(vertex_index) VertexIndex : u32) -> VertexOutput {\r\n\r\n    var positions = array<vec2<f32>, 6>(\r\n        vec2<f32>( 1.0,  1.0),\r\n        vec2<f32>( 1.0, -1.0),\r\n        vec2<f32>(-1.0, -1.0),\r\n        vec2<f32>( 1.0,  1.0),\r\n        vec2<f32>(-1.0, -1.0),\r\n        vec2<f32>(-1.0,  1.0)\r\n    );\r\n\r\n    var texCoords = array<vec2<f32>, 6>(\r\n        vec2<f32>(1.0, 0.0),\r\n        vec2<f32>(1.0, 1.0),\r\n        vec2<f32>(0.0, 1.0),\r\n        vec2<f32>(1.0, 0.0),\r\n        vec2<f32>(0.0, 1.0),\r\n        vec2<f32>(0.0, 0.0)\r\n    );\r\n\r\n    var output : VertexOutput;\r\n    output.Position = vec4<f32>(positions[VertexIndex], 0.0, 1.0);\r\n    output.TexCoord = texCoords[VertexIndex];\r\n    return output;\r\n}\r\n\r\n@fragment\r\nfn frag_main(@location(0) TexCoord : vec2<f32>) -> @location(0) vec4<f32> {\r\n  return textureSample(color_buffer, screen_sampler, TexCoord);\r\n}";var u=function(e,r,n,t){return new(n||(n=Promise))((function(i,s){function a(e){try{c(t.next(e))}catch(e){s(e)}}function o(e){try{c(t.throw(e))}catch(e){s(e)}}function c(e){var r;e.done?i(e.value):(r=e.value,r instanceof n?r:new n((function(e){e(r)}))).then(a,o)}c((t=t.apply(e,r||[])).next())}))};const f=document.getElementById("gfx-main");document.getElementById("sphere-count").innerText=1024..toString();const l=new class{constructor(r){this.nodesUsed=0,this.sphereCount=r,this.spheres=new Array(r);for(let r=0;r<this.spheres.length;r++){const n=[100*Math.random()-50,100*Math.random()-50,100*Math.random()-50],t=.1+1.9*Math.random(),i=[.3+.7*Math.random(),.3+.7*Math.random(),.3+.7*Math.random()];this.spheres[r]=new e(n,t,i)}this.camera=new c([-20,0,0]),this.buildBVH()}buildBVH(){this.sphereIndices=new Array(this.spheres.length);for(var e=0;e<this.sphereCount;e+=1)this.sphereIndices[e]=e;for(this.nodes=new Array(2*this.spheres.length-1),e=0;e<2*this.spheres.length-1;e+=1)this.nodes[e]=new h;var r=this.nodes[0];r.leftChild=0,r.sphereCount=this.spheres.length,this.nodesUsed+=1,this.updateBounds(0),this.subdivide(0)}updateBounds(e){var r=this.nodes[e];r.minCorner=[999999,999999,999999],r.maxCorner=[-999999,-999999,-999999];for(var n=0;n<r.sphereCount;n+=1){const e=this.spheres[this.sphereIndices[r.leftChild+n]],c=[e.radius,e.radius,e.radius];var o=[0,0,0];i(o,e.center,c),s(r.minCorner,r.minCorner,o),t(o,e.center,c),a(r.maxCorner,r.maxCorner,o)}}subdivide(e){var r=this.nodes[e];if(r.sphereCount<=2)return;var n=[0,0,0];i(n,r.maxCorner,r.minCorner);var t=0;n[1]>n[t]&&(t=1),n[2]>n[t]&&(t=2);const s=r.minCorner[t]+n[t]/2;for(var a=r.leftChild,o=a+r.sphereCount-1;a<=o;)if(this.spheres[this.sphereIndices[a]].center[t]<s)a+=1;else{var c=this.sphereIndices[a];this.sphereIndices[a]=this.sphereIndices[o],this.sphereIndices[o]=c,o-=1}var h=a-r.leftChild;if(0==h||h==r.sphereCount)return;const d=this.nodesUsed;this.nodesUsed+=1;const u=this.nodesUsed;this.nodesUsed+=1,this.nodes[d].leftChild=r.leftChild,this.nodes[d].sphereCount=h,this.nodes[u].leftChild=a,this.nodes[u].sphereCount=r.sphereCount-h,r.leftChild=d,r.sphereCount=0,this.updateBounds(d),this.updateBounds(u),this.subdivide(d),this.subdivide(u)}}(1024),p=new class{constructor(e,r){this.render=()=>{let e=performance.now();this.prepareScene();const r=this.device.createCommandEncoder(),n=r.beginComputePass();n.setPipeline(this.ray_tracing_pipeline),n.setBindGroup(0,this.ray_tracing_bind_group),n.dispatchWorkgroups(this.canvas.width,this.canvas.height,1),n.end();const t=this.context.getCurrentTexture().createView(),i=r.beginRenderPass({colorAttachments:[{view:t,clearValue:{r:.5,g:0,b:.25,a:1},loadOp:"clear",storeOp:"store"}]});i.setPipeline(this.screen_pipeline),i.setBindGroup(0,this.screen_bind_group),i.draw(6,1,0,0),i.end(),this.device.queue.submit([r.finish()]),this.device.queue.onSubmittedWorkDone().then((()=>{let r=performance.now(),n=document.getElementById("render-time");n&&(n.innerText=(r-e).toString())})),requestAnimationFrame(this.render)},this.canvas=e,this.scene=r}Initialize(){return u(this,void 0,void 0,(function*(){yield this.setupDevice(),yield this.createAssets(),yield this.makePipeline(),this.render()}))}setupDevice(){var e,r;return u(this,void 0,void 0,(function*(){this.adapter=yield null===(e=navigator.gpu)||void 0===e?void 0:e.requestAdapter(),this.device=yield null===(r=this.adapter)||void 0===r?void 0:r.requestDevice(),this.context=this.canvas.getContext("webgpu"),this.format="bgra8unorm",this.context.configure({device:this.device,format:this.format,alphaMode:"opaque"})}))}makePipeline(){return u(this,void 0,void 0,(function*(){const e=this.device.createBindGroupLayout({entries:[{binding:0,visibility:GPUShaderStage.COMPUTE,storageTexture:{access:"write-only",format:"rgba8unorm",viewDimension:"2d"}},{binding:1,visibility:GPUShaderStage.COMPUTE,buffer:{type:"uniform"}},{binding:2,visibility:GPUShaderStage.COMPUTE,buffer:{type:"read-only-storage",hasDynamicOffset:!1}},{binding:3,visibility:GPUShaderStage.COMPUTE,buffer:{type:"read-only-storage",hasDynamicOffset:!1}},{binding:4,visibility:GPUShaderStage.COMPUTE,buffer:{type:"read-only-storage",hasDynamicOffset:!1}}]});this.ray_tracing_bind_group=this.device.createBindGroup({layout:e,entries:[{binding:0,resource:this.color_buffer_view},{binding:1,resource:{buffer:this.sceneParameters}},{binding:2,resource:{buffer:this.sphereBuffer}},{binding:3,resource:{buffer:this.nodeBuffer}},{binding:4,resource:{buffer:this.sphereIndexBuffer}}]});const r=this.device.createPipelineLayout({bindGroupLayouts:[e]});this.ray_tracing_pipeline=this.device.createComputePipeline({layout:r,compute:{module:this.device.createShaderModule({code:"struct Sphere {\r\n    center: vec3<f32>,\r\n    color: vec3<f32>,\r\n    radius: f32,\r\n}\r\n\r\nstruct ObjectData {\r\n    spheres: array<Sphere>,\r\n}\r\n\r\nstruct Node {\r\n    minCorner: vec3<f32>,\r\n    leftChild: f32,\r\n    maxCorner: vec3<f32>,\r\n    sphereCount: f32,\r\n}\r\n\r\nstruct BVH {\r\n    nodes: array<Node>,\r\n}\r\n\r\nstruct ObjectIndices {\r\n    sphereIndices: array<f32>,\r\n}\r\n\r\nstruct Ray {\r\n    direction: vec3<f32>,\r\n    origin: vec3<f32>,\r\n}\r\n\r\nstruct SceneData {\r\n    cameraPos: vec3<f32>,\r\n    cameraForwards: vec3<f32>,\r\n    cameraRight: vec3<f32>,\r\n    maxBounces: f32,\r\n    cameraUp: vec3<f32>,\r\n    sphereCount: f32,\r\n}\r\n\r\nstruct RenderState {\r\n    t: f32,\r\n    color: vec3<f32>,\r\n    hit: bool,\r\n    position: vec3<f32>,\r\n    normal: vec3<f32>,\r\n}\r\n\r\n@group(0) @binding(0) var color_buffer: texture_storage_2d<rgba8unorm, write>;\r\n@group(0) @binding(1) var<uniform> scene: SceneData;\r\n@group(0) @binding(2) var<storage, read> objects: ObjectData;\r\n@group(0) @binding(3) var<storage, read> tree: BVH;\r\n@group(0) @binding(4) var<storage, read> sphereLookup: ObjectIndices;\r\n\r\n@compute @workgroup_size(1,1,1)\r\nfn main(@builtin(global_invocation_id) GlobalInvocationID : vec3<u32>) {\r\n\r\n    let screen_size: vec2<i32> = vec2<i32>(textureDimensions(color_buffer));\r\n    let screen_pos : vec2<i32> = vec2<i32>(i32(GlobalInvocationID.x), i32(GlobalInvocationID.y));\r\n\r\n    let horizontal_coefficient: f32 = (f32(screen_pos.x) - f32(screen_size.x) / 2) / f32(screen_size.x);\r\n    let vertical_coefficient: f32 = (f32(screen_pos.y) - f32(screen_size.y) / 2) / f32(screen_size.x);\r\n\r\n    let forwards: vec3<f32> = scene.cameraForwards;\r\n    let right: vec3<f32> = scene.cameraRight;\r\n    let up: vec3<f32> = scene.cameraUp;\r\n\r\n    var myRay: Ray;\r\n    myRay.direction = normalize(forwards + horizontal_coefficient * right + vertical_coefficient * up);\r\n    myRay.origin = scene.cameraPos;\r\n\r\n    let pixel_color : vec3<f32> = rayColor(myRay);\r\n\r\n    textureStore(color_buffer, screen_pos, vec4<f32>(pixel_color, 1.0));\r\n}\r\n\r\nfn rayColor(ray: Ray) -> vec3<f32> {\r\n\r\n    var color: vec3<f32> = vec3(1.0, 1.0, 1.0);\r\n    var result: RenderState;\r\n\r\n    var temp_ray: Ray;\r\n    temp_ray.origin = ray.origin;\r\n    temp_ray.direction = ray.direction;\r\n\r\n    let bounces: u32 = u32(scene.maxBounces);\r\n    for(var bounce: u32 = 0; bounce < bounces; bounce++) {\r\n\r\n        result = trace(temp_ray);\r\n\r\n        //unpack color\r\n        color = color * result.color;\r\n\r\n        //early exit\r\n        if (!result.hit) {\r\n            break;\r\n        }\r\n\r\n        //Set up for next trace\r\n        temp_ray.origin = result.position;\r\n        temp_ray.direction = normalize(reflect(temp_ray.direction, result.normal));\r\n    }\r\n\r\n    //Rays which reached terminal state and bounced indefinitely\r\n    if (result.hit) {\r\n        color = vec3(0.0, 0.0, 0.0);\r\n    }\r\n\r\n    return color;\r\n}\r\n\r\nfn trace(ray: Ray) -> RenderState {\r\n\r\n    //Set up the Render State\r\n    var renderState: RenderState;\r\n    //sky color\r\n    renderState.color = vec3(1.0, 1.0, 1.0);\r\n    renderState.hit = false;\r\n    var nearestHit: f32 = 9999;\r\n\r\n    //Set up for BVH Traversal\r\n    var node: Node = tree.nodes[0];\r\n    var stack: array<Node, 15>;\r\n    var stackLocation: u32 = 0;\r\n\r\n    while (true) {\r\n\r\n        var sphereCount: u32 = u32(node.sphereCount);\r\n        var contents: u32 = u32(node.leftChild);\r\n\r\n        if (sphereCount == 0) {\r\n            var child1: Node = tree.nodes[contents];\r\n            var child2: Node = tree.nodes[contents + 1];\r\n\r\n            var distance1: f32 = hit_aabb(ray, child1);\r\n            var distance2: f32 = hit_aabb(ray, child2);\r\n            if (distance1 > distance2) {\r\n                var tempDist: f32 = distance1;\r\n                distance1 = distance2;\r\n                distance2 = tempDist;\r\n\r\n                var tempChild: Node = child1;\r\n                child1 = child2;\r\n                child2 = tempChild;\r\n            }\r\n\r\n            if (distance1 > nearestHit) {\r\n                if (stackLocation == 0) {\r\n                    break;\r\n                }\r\n                else {\r\n                    stackLocation -= 1;\r\n                    node = stack[stackLocation];\r\n                }\r\n            }\r\n            else {\r\n                node = child1;\r\n                if (distance2 < nearestHit) {\r\n                    stack[stackLocation] = child2;\r\n                    stackLocation += 1;\r\n                }\r\n            }\r\n        }\r\n        else {\r\n            for (var i: u32 = 0; i < sphereCount; i++) {\r\n        \r\n                var newRenderState: RenderState = hit_sphere(\r\n                    ray, \r\n                    objects.spheres[u32(sphereLookup.sphereIndices[i + contents])], \r\n                    0.001, nearestHit, renderState\r\n                );\r\n\r\n                if (newRenderState.hit) {\r\n                    nearestHit = newRenderState.t;\r\n                    renderState = newRenderState;\r\n                }\r\n            }\r\n\r\n            if (stackLocation == 0) {\r\n                break;\r\n            }\r\n            else {\r\n                stackLocation -= 1;\r\n                node = stack[stackLocation];\r\n            }\r\n        }\r\n    }\r\n\r\n    return renderState;\r\n}\r\n\r\nfn hit_sphere(ray: Ray, sphere: Sphere, tMin: f32, tMax: f32, oldRenderState: RenderState) -> RenderState {\r\n    \r\n    let co: vec3<f32> = ray.origin - sphere.center;\r\n    let a: f32 = dot(ray.direction, ray.direction);\r\n    let b: f32 = 2.0 * dot(ray.direction, co);\r\n    let c: f32 = dot(co, co) - sphere.radius * sphere.radius;\r\n    let discriminant: f32 = b * b - 4.0 * a * c;\r\n\r\n    var renderState: RenderState;\r\n    renderState.color = oldRenderState.color;\r\n\r\n    if (discriminant > 0.0) {\r\n\r\n        let t: f32 = (-b - sqrt(discriminant)) / (2 * a);\r\n\r\n        if (t > tMin && t < tMax) {\r\n\r\n            renderState.position = ray.origin + t * ray.direction;\r\n            renderState.normal = normalize(renderState.position - sphere.center);\r\n            renderState.t = t;\r\n            renderState.color = sphere.color;\r\n            renderState.hit = true;\r\n            return renderState;\r\n        }\r\n    }\r\n\r\n    renderState.hit = false;\r\n    return renderState;\r\n    \r\n}\r\n\r\nfn hit_aabb(ray: Ray, node: Node) -> f32 {\r\n    var inverseDir: vec3<f32> = vec3(1.0) / ray.direction;\r\n    var t1: vec3<f32> = (node.minCorner - ray.origin) * inverseDir;\r\n    var t2: vec3<f32> = (node.maxCorner - ray.origin) * inverseDir;\r\n    var tMin: vec3<f32> = min(t1, t2);\r\n    var tMax: vec3<f32> = max(t1, t2);\r\n\r\n    var t_min: f32 = max(max(tMin.x, tMin.y), tMin.z);\r\n    var t_max: f32 = min(min(tMax.x, tMax.y), tMax.z);\r\n\r\n    if (t_min > t_max || t_max < 0) {\r\n        return 99999;\r\n    }\r\n    else {\r\n        return t_min;\r\n    }\r\n}"}),entryPoint:"main"}});const n=this.device.createBindGroupLayout({entries:[{binding:0,visibility:GPUShaderStage.FRAGMENT,sampler:{}},{binding:1,visibility:GPUShaderStage.FRAGMENT,texture:{}}]});this.screen_bind_group=this.device.createBindGroup({layout:n,entries:[{binding:0,resource:this.sampler},{binding:1,resource:this.color_buffer_view}]});const t=this.device.createPipelineLayout({bindGroupLayouts:[n]});this.screen_pipeline=this.device.createRenderPipeline({layout:t,vertex:{module:this.device.createShaderModule({code:d}),entryPoint:"vert_main"},fragment:{module:this.device.createShaderModule({code:d}),entryPoint:"frag_main",targets:[{format:"bgra8unorm"}]},primitive:{topology:"triangle-list"}})}))}createAssets(){return u(this,void 0,void 0,(function*(){this.color_buffer=this.device.createTexture({size:{width:this.canvas.width,height:this.canvas.height},format:"rgba8unorm",usage:GPUTextureUsage.COPY_DST|GPUTextureUsage.STORAGE_BINDING|GPUTextureUsage.TEXTURE_BINDING}),this.color_buffer_view=this.color_buffer.createView(),this.sampler=this.device.createSampler({addressModeU:"repeat",addressModeV:"repeat",magFilter:"linear",minFilter:"nearest",mipmapFilter:"nearest",maxAnisotropy:1});const e={size:64,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST};this.sceneParameters=this.device.createBuffer(e);const r={size:32*this.scene.sphereCount,usage:GPUBufferUsage.STORAGE|GPUBufferUsage.COPY_DST};this.sphereBuffer=this.device.createBuffer(r);const n={size:32*this.scene.nodesUsed,usage:GPUBufferUsage.STORAGE|GPUBufferUsage.COPY_DST};this.nodeBuffer=this.device.createBuffer(n);const t={size:4*this.scene.sphereCount,usage:GPUBufferUsage.STORAGE|GPUBufferUsage.COPY_DST};this.sphereIndexBuffer=this.device.createBuffer(t)}))}prepareScene(){const e={cameraPos:this.scene.camera.position,cameraForwards:this.scene.camera.forwards,cameraRight:this.scene.camera.right,cameraUp:this.scene.camera.up,sphereCount:this.scene.sphereCount};this.device.queue.writeBuffer(this.sceneParameters,0,new Float32Array([e.cameraPos[0],e.cameraPos[1],e.cameraPos[2],0,e.cameraForwards[0],e.cameraForwards[1],e.cameraForwards[2],0,e.cameraRight[0],e.cameraRight[1],e.cameraRight[2],4,e.cameraUp[0],e.cameraUp[1],e.cameraUp[2],e.sphereCount]),0,16);const r=new Float32Array(8*this.scene.sphereCount);for(let e=0;e<this.scene.sphereCount;e++)r[8*e]=this.scene.spheres[e].center[0],r[8*e+1]=this.scene.spheres[e].center[1],r[8*e+2]=this.scene.spheres[e].center[2],r[8*e+3]=0,r[8*e+4]=this.scene.spheres[e].color[0],r[8*e+5]=this.scene.spheres[e].color[1],r[8*e+6]=this.scene.spheres[e].color[2],r[8*e+7]=this.scene.spheres[e].radius;this.device.queue.writeBuffer(this.sphereBuffer,0,r,0,8*this.scene.sphereCount);const n=new Float32Array(8*this.scene.nodesUsed);for(let e=0;e<this.scene.nodesUsed;e++)n[8*e]=this.scene.nodes[e].minCorner[0],n[8*e+1]=this.scene.nodes[e].minCorner[1],n[8*e+2]=this.scene.nodes[e].minCorner[2],n[8*e+3]=this.scene.nodes[e].leftChild,n[8*e+4]=this.scene.nodes[e].maxCorner[0],n[8*e+5]=this.scene.nodes[e].maxCorner[1],n[8*e+6]=this.scene.nodes[e].maxCorner[2],n[8*e+7]=this.scene.nodes[e].sphereCount;this.device.queue.writeBuffer(this.nodeBuffer,0,n,0,8*this.scene.nodesUsed);const t=new Float32Array(this.scene.sphereCount);for(let e=0;e<this.scene.sphereCount;e++)t[e]=this.scene.sphereIndices[e];this.device.queue.writeBuffer(this.sphereIndexBuffer,0,t,0,this.scene.sphereCount)}}(f,l);p.Initialize()})();