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
import { COARSE_PARTITION_TYPE, filenames, FINE_PARTITION_TYPE, object_type_count, scales } from "../constants";
import { Random } from "random";

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
    meshes: Map<FINE_PARTITION_TYPE, ObjMesh>;
    coarse_indices: Map<COARSE_PARTITION_TYPE, number>;
    fine_indices: Map<FINE_PARTITION_TYPE, number>[];

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

        this.meshes = new Map();
        this.coarse_indices = new Map();
        this.fine_indices = [new Map(), new Map()];
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

        await this.load_models();

        this.build_tlas();

        this.allocate_coarse_partitions();

        this.allocate_fine_partitions();

        this.upload_meshes();

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

    async load_models() {

        let random = new Random();
        for (let i = 1; i < object_type_count + 1; i++) {
            let object_type: FINE_PARTITION_TYPE = FINE_PARTITION_TYPE.TLAS + i;
            let mesh = new ObjMesh();
            this.meshes.set(object_type, mesh);
            let r = random.float(0.0, 1.0);
            let g = random.float(0.0, 1.0);
            let b = random.float(0.0, 1.0);
            let color: vec3 = [r, g, b];
            let filename: string = filenames.get(object_type)!;
            let scale: number = scales.get(object_type)!;
            await mesh.initialize(color, filename, scale);
        }
    }

    build_tlas() {

        let input_nodes = new Array<Node>(this.scene.objects.length);
        for (let i = 0; i < this.scene.objects.length; ++i) {
            let mesh = this.meshes.get(this.scene.objects[i].object_type)!;
            let node = mesh.get_node();
            // Putting in a dummy root node of 0 for now, since the buffer hasn't actually been built
            input_nodes[i] = new BlasDescription(node, this.scene.objects[i].model, 0).get_node();
        }
        this.tlas = new BVH(input_nodes);
    }

    allocate_coarse_partitions() {
        var node_count = 2 * this.scene.objects.length - 1;
        var index_count = this.scene.objects.length;

        for (let i = 1; i < object_type_count + 1; i++) {
            let object_type: FINE_PARTITION_TYPE = FINE_PARTITION_TYPE.TLAS + i;
            let mesh = this.meshes.get(object_type)!;
            node_count += mesh.bvh.nodes.length;
            index_count += mesh.bvh.indices.length;
        }

        let node_size = 32 * node_count;
        let index_size = 4 * index_count;
        let usage = GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST;

        this.bvh_buffer = new Buffer(this.device)
        this.coarse_indices.set(
            COARSE_PARTITION_TYPE.NODES, 
            this.bvh_buffer.add_coarse_partition(node_size, usage));
        this.coarse_indices.set(
                COARSE_PARTITION_TYPE.LOOKUP, 
                this.bvh_buffer.add_coarse_partition(index_size, usage));
        this.bvh_buffer.Initialize();
    }

    allocate_fine_partitions() {

        // TLAS
        let coarse_index = this.coarse_indices.get(COARSE_PARTITION_TYPE.NODES)!;
        let element_count = 8 * (2 * this.scene.objects.length - 1);
        let payload = [0, 0];
        this.fine_indices[coarse_index].set(FINE_PARTITION_TYPE.TLAS, 
            this.bvh_buffer.add_fine_partition(coarse_index, element_count, payload));
        
        coarse_index = this.coarse_indices.get(COARSE_PARTITION_TYPE.LOOKUP)!;
        element_count = this.scene.objects.length;
        payload = [0,];
        this.fine_indices[coarse_index].set(
            FINE_PARTITION_TYPE.TLAS, 
            this.bvh_buffer.add_fine_partition(coarse_index, element_count, payload));

        // Meshes
        var node_offset = 2 * this.scene.objects.length - 1;
        var index_offset = this.scene.objects.length;
        var tri_offset = 0;
        for (let i = 1; i < object_type_count + 1; i++) {
            let object_type: FINE_PARTITION_TYPE = FINE_PARTITION_TYPE.TLAS + i;
            let mesh = this.meshes.get(object_type)!;

            // Nodes
            coarse_index = this.coarse_indices.get(COARSE_PARTITION_TYPE.NODES)!;
            element_count = 8 * mesh.bvh.nodes.length;
            payload = [node_offset, index_offset];
            let fine_index = this.bvh_buffer.add_fine_partition(coarse_index, element_count, payload);
            this.fine_indices[coarse_index].set(object_type, fine_index);
            node_offset += mesh.bvh.nodes.length;
            let node_data = mesh.bvh.get_flattened_nodes(payload);
            this.bvh_buffer.blit_to_fine_partition(coarse_index, fine_index, node_data);
            this.bvh_buffer.upload_fine_partition(coarse_index, fine_index);
        
        

            // Indices
            coarse_index = this.coarse_indices.get(COARSE_PARTITION_TYPE.LOOKUP)!;
            element_count = mesh.bvh.indices.length;
            payload = [tri_offset,];
            fine_index = this.bvh_buffer.add_fine_partition(coarse_index, element_count, payload);
            this.fine_indices[coarse_index].set(object_type, fine_index);
            index_offset += mesh.bvh.indices.length;
            tri_offset += mesh.bvh.indices.length;
            let index_data = mesh.bvh.get_flattened_indices(payload);
            this.bvh_buffer.blit_to_fine_partition(coarse_index, fine_index, index_data);
            this.bvh_buffer.upload_fine_partition(coarse_index, fine_index);
        }
    }

    upload_meshes() {

        var triangle_count = 0;
        for (let i = 1; i < object_type_count + 1; i++) {
            let object_type: FINE_PARTITION_TYPE = FINE_PARTITION_TYPE.TLAS + i;
            let mesh = this.meshes.get(object_type)!;
            triangle_count += mesh.triangles.length;
        }

        this.triangleBuffer = new Buffer(this.device);
        let size = 4 * 28 * triangle_count;
        let usage = GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST;
        this.triangleBuffer.add_coarse_partition(size, usage);
        this.triangleBuffer.Initialize();

        // Upload mesh triangles
        let blit_offset = 0;
        let coarse_index = this.coarse_indices.get(COARSE_PARTITION_TYPE.NODES)!;
        for (let i = 1; i < object_type_count + 1; i++) {
            let object_type: FINE_PARTITION_TYPE = FINE_PARTITION_TYPE.TLAS + i;
            let mesh = this.meshes.get(object_type)!;
            //console.log("Triangle count: %d", mesh.triangles.length);
            //console.log(mesh.triangles);
            //console.log(filenames.get(object_type));

            for (let i = 0; i < mesh.triangles.length; i++) {
                mesh.triangles[i].flatten()
                this.triangleBuffer.blit_to_coarse_partition(
                    coarse_index, mesh.triangles[i].data, blit_offset);
                blit_offset += 28;
            }
        }
        this.triangleBuffer.upload_coarse_partition(coarse_index);
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
        let input_nodes = new Array<Node>(this.scene.objects.length);
        for (let i = 0; i < this.scene.objects.length; i++) {
            let object = this.scene.objects[i];
            let statue_node = this.meshes.get(object.object_type)!.get_node();
            let blas_root_node = this.bvh_buffer.get_fine_partition(0, object.object_type).offset / 8;
            let instance = new BlasDescription(
                statue_node, object.model, blas_root_node);
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