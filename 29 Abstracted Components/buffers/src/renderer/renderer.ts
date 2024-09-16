import raytracer_kernel from "../shaders/raytracer_kernel.wgsl"
import screen_shader from "../shaders/screen_shader.wgsl"
import { Scene } from "../scene";
import { CubeMapMaterial } from "./cube_material";
import { Pipeline } from "./pipelines";
import { Buffer } from "./buffer";

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

    // Scene to render
    scene: Scene
    frametime: number
    loaded: boolean

    constructor(canvas: HTMLCanvasElement, scene: Scene){
        this.canvas = canvas;
        this.scene = scene;
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
        this.loaded = false;

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

        this.sceneParameters = new Buffer(this.device, GPUBufferUsage.COPY_DST | GPUBufferUsage.UNIFORM, 16);
        this.sceneParameters.Initialize();

        this.triangleBuffer = new Buffer(this.device, 
            GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST, 
            28 * this.scene.triangles.length);
        this.triangleBuffer.Initialize();

        this.nodeBuffer = new Buffer(this.device, 
            GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST, 
            8 * this.scene.nodes.length);
        this.nodeBuffer.Initialize();

        this.blasDescriptionBuffer = new Buffer(this.device,
            GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
            20 * this.scene.blasDescriptions.length);
        this.blasDescriptionBuffer.Initialize();

        this.triangleIndexBuffer = new Buffer(this.device,
            GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
            this.scene.triangles.length);
        this.triangleIndexBuffer.Initialize();

        this.blasIndexBuffer = new Buffer(this.device,
            GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
            this.scene.blasIndices.length);
        this.blasIndexBuffer.Initialize();

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
                        buffer: this.nodeBuffer.deviceMemory,
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
                        buffer: this.triangleIndexBuffer.deviceMemory,
                    }
                },
                {
                    binding: 6,
                    resource: {
                        buffer: this.blasIndexBuffer.deviceMemory,
                    }
                },
                {
                    binding: 7,
                    resource: this.sky_texture.view,
                },
                {
                    binding: 8,
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

        this.sceneParameters.blit(this.scene.camera.data, 0);
        this.sceneParameters.upload();

        for (let i = 0; i < this.scene.blasDescriptions.length; i++) {
            this.scene.blasDescriptions[i].flatten();
            this.blasDescriptionBuffer.blit(this.scene.blasDescriptions[i].data, 20*i);
        }
        this.blasDescriptionBuffer.upload();

        this.scene.flattenObjects();
        this.blasIndexBuffer.blit(this.scene.blasIndexData, 0);
        this.blasIndexBuffer.upload();

        //Write the tlas nodes
        for (let i = 0; i < this.scene.nodesUsed; i++) {
            this.scene.nodes[i].flatten();
            this.nodeBuffer.blit(this.scene.nodes[i].data, 8 * i);
        }
        this.device.queue.writeBuffer(this.nodeBuffer.deviceMemory, 0, 
            this.nodeBuffer.hostMemory, 0, 8 * this.scene.nodesUsed);

        if (this.loaded) {
            return;
        }
        this.loaded = true;
        for (let i = 0; i < this.scene.triangles.length; i++) {
            this.scene.triangles[i].flatten();
            this.triangleBuffer.blit(this.scene.triangles[i].data, 28 * i);
        }
        this.triangleBuffer.upload();

        //Write blas data
        for (let i = 0; i < this.scene.statue_mesh.nodesUsed; i++) {
            let baseIndex: number = this.scene.tlasNodesMax + i;
            this.scene.nodes[baseIndex].flatten();
            this.nodeBuffer.blit(this.scene.nodes[baseIndex].data, 8 * baseIndex);
        }
        this.nodeBuffer.upload();

        this.triangleIndexBuffer.blit(this.scene.triangleIndexData, 0);
        this.triangleIndexBuffer.upload();
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