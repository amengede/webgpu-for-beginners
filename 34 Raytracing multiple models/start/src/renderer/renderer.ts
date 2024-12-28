import raytracer_kernel from "../shaders/raytracer_kernel.wgsl"
import screen_shader from "../shaders/screen_shader.wgsl"
import { Scene } from "../scene";
import { CubeMapMaterial } from "./cube_material";
import { Pipeline } from "./pipelines";
import { Buffer } from "./buffer";
import { ObjMesh } from "../mesh/obj_mesh";
import { vec3 } from "gl-matrix";
import { Node } from "../acceleration_structures/node";
import { BVH } from "../acceleration_structures/bvh";
import { BlasDescription } from "../acceleration_structures/blas_description";

export class Renderer {

    canvas: HTMLCanvasElement;

    // Device/Context objects
    adapter: GPUAdapter;
    device: GPUDevice;
    context: GPUCanvasContext;
    format : GPUTextureFormat;

    //Assets
    color_buffer: GPUTexture;
    color_buffer_view: GPUTextureView;
    sampler: GPUSampler;
    sceneParameters: Buffer;
    triangleBuffer: Buffer;
    nodeBuffer: Buffer;
    blasDescriptionBuffer: Buffer;
    triangleIndexBuffer: Buffer;
    blasIndexBuffer: Buffer;
    sky_texture: CubeMapMaterial;

    // Pipeline objects
    ray_tracing_pipeline: Pipeline<GPUComputePipeline>
    ray_tracing_bind_group: GPUBindGroup
    screen_pipeline: Pipeline<GPURenderPipeline>
    screen_bind_group: GPUBindGroup

    // Meshes
    statue_mesh: ObjMesh;

    // Scene to render
    scene: Scene
    frametime: number
    loaded: boolean = false;

    // BVH
    bvh_buffer: Buffer;
    tlas: BVH;

    constructor(canvas: HTMLCanvasElement, scene: Scene){
        this.canvas = canvas;
        this.scene = scene;

        // Make objMesh
        this.statue_mesh = new ObjMesh();
    }

   async Initialize() {

        await this.setupDevice();

        this.ray_tracing_pipeline = new Pipeline<GPUComputePipeline>(this.device, GPUShaderStage.COMPUTE);
        this.screen_pipeline = new Pipeline<GPURenderPipeline>(this.device, GPUShaderStage.FRAGMENT);

        await this.makeBindGroupLayouts();

        await this.createAssets();

        await this.makeBindGroups();
    
        await this.makePipelines();

        this.frametime = 16;

        this.render();
    }

    async setupDevice() {

        //adapter: wrapper around (physical) GPU.
        //Describes features and limits
        this.adapter = <GPUAdapter> await navigator.gpu?.requestAdapter();
        //device: wrapper around GPU functionality
        //Function calls are made through the device
        this.device = <GPUDevice> await this.adapter?.requestDevice();
        //context: similar to vulkan instance (or OpenGL context)
        this.context = <GPUCanvasContext> this.canvas.getContext("webgpu");
        this.format = "bgra8unorm";
        this.context.configure({
            device: this.device,
            format: this.format,
            alphaMode: "opaque"
        });

    }

    async makeBindGroupLayouts() {

        this.ray_tracing_pipeline.addImage2D();
        this.ray_tracing_pipeline.addBuffer('uniform');
        this.ray_tracing_pipeline.addBuffer('read-only-storage');
        this.ray_tracing_pipeline.addBuffer('read-only-storage');
        this.ray_tracing_pipeline.addBuffer('read-only-storage');
        this.ray_tracing_pipeline.addBuffer('read-only-storage');
        this.ray_tracing_pipeline.addImageCube();
        await this.ray_tracing_pipeline.makeBindGroupLayout();

        this.screen_pipeline.addImage2D();
        await this.screen_pipeline.makeBindGroupLayout();

    }

    async createAssets() {

        //console.log("Create Assets");
        
        this.color_buffer = this.device.createTexture(
            {
                size: {
                    width: this.canvas.width,
                    height: this.canvas.height,
                },
                format: "rgba8unorm",
                usage: GPUTextureUsage.COPY_DST | GPUTextureUsage.STORAGE_BINDING | GPUTextureUsage.TEXTURE_BINDING
            }
        );
        this.color_buffer_view = this.color_buffer.createView();

        const samplerDescriptor: GPUSamplerDescriptor = {
            addressModeU: "repeat",
            addressModeV: "repeat",
            magFilter: "linear",
            minFilter: "nearest",
            mipmapFilter: "nearest",
            maxAnisotropy: 1
        };
        this.sampler = this.device.createSampler(samplerDescriptor);

        this.sceneParameters = new Buffer(this.device)
        this.sceneParameters.add_coarse_partition(16 * 4, GPUBufferUsage.COPY_DST | GPUBufferUsage.UNIFORM);
        this.sceneParameters.Initialize();

        // Load model
        let color: vec3 = [1.0, 1.0, 1.0];
        let filename: string = "dist/models/statue.obj";
        await this.statue_mesh.initialize(color, filename);

        // Build bvh from scene
        let input_nodes = new Array<Node>(this.scene.objects.length);
        let mesh_node = this.statue_mesh.get_node();
        let blas_root_node = 2 * this.scene.objects.length - 1;
        for (let i = 0; i < this.scene.objects.length; ++i) {
            input_nodes[i] = new BlasDescription(
                mesh_node, this.scene.objects[i].model, blas_root_node).get_node();
        }
        this.tlas = new BVH(input_nodes);

        let tlas_node_count = 2 * this.scene.objects.length - 1;
        let tlas_index_count = this.scene.objects.length;
        let blas_node_count = this.statue_mesh.bvh.nodes.length;
        let blas_index_count = this.statue_mesh.bvh.indices.length;
        let node_size = 8 * (tlas_node_count + blas_node_count);
        let index_size = tlas_index_count + blas_index_count;

        this.bvh_buffer = new Buffer(this.device)
        this.bvh_buffer.add_coarse_partition(node_size * 4, GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST);
        this.bvh_buffer.add_coarse_partition(index_size * 4, GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST);
        this.bvh_buffer.Initialize();

        // Partition BVH buffer
        // 0,0: tlas nodes
        let coarse_index = 0;
        let element_count = 8 * tlas_node_count;
        let payload = [0, 0];
        this.bvh_buffer.add_fine_partition(coarse_index, element_count, payload);
        // 0,1: blas nodes (statue)
        element_count = 8 * blas_node_count;
        payload = [tlas_node_count, tlas_index_count];
        this.bvh_buffer.add_fine_partition(coarse_index, element_count, payload);
        // 1,0: tlas indices
        coarse_index = 1;
        element_count = tlas_index_count;
        payload = [0,];
        this.bvh_buffer.add_fine_partition(coarse_index, element_count, payload);
        // 1,1: blas indices (statue)
        element_count = blas_index_count;
        payload = [0,];
        this.bvh_buffer.add_fine_partition(coarse_index, element_count, payload);

        // Upload mesh bvh
        coarse_index = 0;
        let fine_index = 1;
        let partition = this.bvh_buffer.get_fine_partition(coarse_index, fine_index);
        payload = partition.payload;
        let node_data = this.statue_mesh.bvh.get_flattened_nodes(payload);
        this.bvh_buffer.blit_to_fine_partition(coarse_index, fine_index, node_data);
        this.bvh_buffer.upload_fine_partition(coarse_index, fine_index);
        
        coarse_index = 1;
        partition = this.bvh_buffer.get_fine_partition(coarse_index, fine_index);
        payload = partition.payload;
        let index_data = this.statue_mesh.bvh.get_flattened_indices(payload);
        this.bvh_buffer.blit_to_fine_partition(coarse_index, fine_index, index_data);
        this.bvh_buffer.upload_fine_partition(coarse_index, fine_index);

        this.triangleBuffer = new Buffer(this.device);
        this.triangleBuffer.add_coarse_partition(
            4 * 28 * this.statue_mesh.triangles.length, 
            GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST);
        this.triangleBuffer.Initialize();

        // Upload mesh triangles
        let blit_offset = 0;
        coarse_index = 0;
        for (let i = 0; i < this.statue_mesh.triangles.length; i++) {
            this.statue_mesh.triangles[i].flatten()
            this.triangleBuffer.blit_to_coarse_partition(
                coarse_index, this.statue_mesh.triangles[i].data, blit_offset);
            blit_offset += 28;
        }
        this.triangleBuffer.upload_coarse_partition(coarse_index);

        this.blasDescriptionBuffer = new Buffer(this.device)
        this.blasDescriptionBuffer.add_coarse_partition(
            4 * 20 * this.scene.objects.length,
            GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST);
        this.blasDescriptionBuffer.Initialize();

        const urls = [
            "dist/gfx/sky_front.png",  //x+
            "dist/gfx/sky_back.png",   //x-
            "dist/gfx/sky_left.png",   //y+
            "dist/gfx/sky_right.png",  //y-
            "dist/gfx/sky_bottom.png", //z+
            "dist/gfx/sky_top.png",    //z-
        ]
        this.sky_texture = new CubeMapMaterial();
        await this.sky_texture.initialize(this.device, urls);
    }

    async makeBindGroups() {

        this.ray_tracing_bind_group = this.device.createBindGroup({
            layout: this.ray_tracing_pipeline.bind_group_layout,
            entries: [
                {
                    binding: 0,
                    resource: this.color_buffer_view
                },
                {
                    binding: 1,
                    resource: {
                        buffer: this.sceneParameters.deviceMemory,
                    }
                },
                {
                    binding: 2,
                    resource: {
                        buffer: this.triangleBuffer.deviceMemory,
                    }
                },
                {
                    binding: 3,
                    resource: {
                        label: "BVH Node buffer",
                        buffer: this.bvh_buffer.deviceMemory,
                        offset: this.bvh_buffer.get_coarse_partition(0).offset,
                    }
                },
                {
                    binding: 4,
                    resource: {
                        buffer: this.blasDescriptionBuffer.deviceMemory,
                    }
                },
                {
                    binding: 5,
                    resource: {
                        label: "BVH Index buffer",
                        buffer: this.bvh_buffer.deviceMemory,
                        offset: this.bvh_buffer.get_coarse_partition(1).offset,
                    }
                },
                {
                    binding: 6,
                    resource: this.sky_texture.view,
                },
                {
                    binding: 7,
                    resource: this.sky_texture.sampler,
                },
            ]
        });

        this.screen_bind_group = this.device.createBindGroup({
            layout: this.screen_pipeline.bind_group_layout,
            entries: [
                {
                    binding: 0,
                    resource:  this.sampler
                },
                {
                    binding: 1,
                    resource: this.color_buffer_view
                }
            ]
        });

    }

    async makePipelines() {

        await this.ray_tracing_pipeline.build(raytracer_kernel, ['main',]);
        await this.screen_pipeline.build(screen_shader, ['vert_main', 'frag_main']);
        
    }

    prepareScene() {

        let coarse_index = 0;
        this.sceneParameters.blit_to_coarse_partition(coarse_index, this.scene.camera.data, 0);
        this.sceneParameters.upload_coarse_partition(coarse_index);

        // Get descriptions of statues
        let blit_offset = 0;
        let statue_node = this.statue_mesh.get_node();
        let blas_root_node = this.bvh_buffer.get_fine_partition(0, 1).offset / 8;
        let input_nodes = new Array<Node>(this.scene.objects.length);
        for (let i = 0; i < this.scene.objects.length; i++) {
            let instance = new BlasDescription(
                statue_node, this.scene.objects[i].model, blas_root_node);
            this.blasDescriptionBuffer.blit_to_coarse_partition(coarse_index, instance.data, blit_offset);
            blit_offset += 20;
            input_nodes[i] = instance.get_node();
        }
        this.blasDescriptionBuffer.upload_coarse_partition(coarse_index);

        // Build TLAS
        this.tlas = new BVH(input_nodes);

        // Upload TLAS
        let fine_index = 0;
        let payload = this.bvh_buffer.get_fine_partition(coarse_index, fine_index).payload;
        let node_data = this.tlas.get_flattened_nodes(payload);
        this.bvh_buffer.blit_to_fine_partition(coarse_index, fine_index, node_data);
        this.bvh_buffer.upload_fine_partition(coarse_index, fine_index);
        
        coarse_index = 1;
        payload = this.bvh_buffer.get_fine_partition(coarse_index, fine_index).payload;
        let index_data = this.tlas.get_flattened_indices(payload);
        this.bvh_buffer.blit_to_fine_partition(coarse_index, fine_index, index_data);
        this.bvh_buffer.upload_fine_partition(coarse_index, fine_index);

        if (!this.loaded) {
            this.loaded = true;
            //console.log(node_data);
            //console.log(index_data);
            //console.log(this.blasDescriptionBuffer.hostMemory);
        }
    }

    render = () => {

        let start: number = performance.now();

        this.scene.update(this.frametime);

        this.prepareScene();

        const commandEncoder : GPUCommandEncoder = this.device.createCommandEncoder();

        const ray_trace_pass : GPUComputePassEncoder = commandEncoder.beginComputePass();
        ray_trace_pass.setPipeline(this.ray_tracing_pipeline.pipeline);
        ray_trace_pass.setBindGroup(0, this.ray_tracing_bind_group);
        ray_trace_pass.dispatchWorkgroups(
            this.canvas.width / 8, 
            this.canvas.height / 8, 1
        );
        ray_trace_pass.end();

        const textureView : GPUTextureView = this.context.getCurrentTexture().createView();
        const renderpass : GPURenderPassEncoder = commandEncoder.beginRenderPass({
            colorAttachments: [{
                view: textureView,
                clearValue: {r: 0.5, g: 0.0, b: 0.25, a: 1.0},
                loadOp: "clear",
                storeOp: "store"
            }]
        });

        renderpass.setPipeline(this.screen_pipeline.pipeline);
        renderpass.setBindGroup(0, this.screen_bind_group);
        renderpass.draw(6, 1, 0, 0);
        
        renderpass.end();
    
        this.device.queue.submit([commandEncoder.finish()]);

        this.device.queue.onSubmittedWorkDone().then(
            () => {
                let end: number = performance.now();
                this.frametime = end - start;
                let performanceLabel: HTMLElement =  <HTMLElement> document.getElementById("render-time");
                if (performanceLabel) {
                    performanceLabel.innerText = this.frametime.toString();
                }
            }
        );

        requestAnimationFrame(this.render);
    }
    
}