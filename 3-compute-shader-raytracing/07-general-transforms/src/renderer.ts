import raytracer_kernel from "./shaders/raytracer_kernel.wgsl"
import screen_shader from "./shaders/screen_shader.wgsl"
import { Scene } from "./scene";
import { CubeMapMaterial } from "./cube_material";

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
    sceneParameters: GPUBuffer;
    triangleBuffer: GPUBuffer;
    nodeBuffer: GPUBuffer;
    triangleIndexBuffer: GPUBuffer;
    sky_texture: CubeMapMaterial;

    // Pipeline objects
    ray_tracing_pipeline: GPUComputePipeline
    ray_tracing_bind_group_layout: GPUBindGroupLayout
    ray_tracing_bind_group: GPUBindGroup
    screen_pipeline: GPURenderPipeline
    screen_bind_group_layout: GPUBindGroupLayout
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

        this.ray_tracing_bind_group_layout = this.device.createBindGroupLayout({
            entries: [
                {
                    binding: 0,
                    visibility: GPUShaderStage.COMPUTE,
                    storageTexture: {
                        access: "write-only",
                        format: "rgba8unorm",
                        viewDimension: "2d"
                    }
                },
                {
                    binding: 1,
                    visibility: GPUShaderStage.COMPUTE,
                    buffer: {
                        type: "uniform",
                    }
                },
                {
                    binding: 2,
                    visibility: GPUShaderStage.COMPUTE,
                    buffer: {
                        type: "read-only-storage",
                        hasDynamicOffset: false
                    }
                },
                {
                    binding: 3,
                    visibility: GPUShaderStage.COMPUTE,
                    buffer: {
                        type: "read-only-storage",
                        hasDynamicOffset: false
                    }
                },
                {
                    binding: 4,
                    visibility: GPUShaderStage.COMPUTE,
                    buffer: {
                        type: "read-only-storage",
                        hasDynamicOffset: false
                    }
                },
                {
                    binding: 5,
                    visibility: GPUShaderStage.COMPUTE,
                    texture: {
                        viewDimension: "cube",
                    }
                },
                {
                    binding: 6,
                    visibility: GPUShaderStage.COMPUTE,
                    sampler: {}
                }
            ]

        });

        this.screen_bind_group_layout = this.device.createBindGroupLayout({
            entries: [
                {
                    binding: 0,
                    visibility: GPUShaderStage.FRAGMENT,
                    sampler: {}
                },
                {
                    binding: 1,
                    visibility: GPUShaderStage.FRAGMENT,
                    texture: {}
                },
            ]

        });

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

        const parameterBufferDescriptor: GPUBufferDescriptor = {
            size: 128,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
        };
        this.sceneParameters = this.device.createBuffer(
            parameterBufferDescriptor
        );

        const triangleBufferDescriptor: GPUBufferDescriptor = {
            size: 112 * this.scene.triangleCount,
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
        };
        this.triangleBuffer = this.device.createBuffer(
            triangleBufferDescriptor
        );

        const nodeBufferDescriptor: GPUBufferDescriptor = {
            size: 32 * this.scene.nodesUsed,
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
        };
        this.nodeBuffer = this.device.createBuffer(
            nodeBufferDescriptor
        );

        const triangleIndexBufferDescriptor: GPUBufferDescriptor = {
            size: 4 * this.scene.triangleCount,
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
        };
        this.triangleIndexBuffer = this.device.createBuffer(
            triangleIndexBufferDescriptor
        );

        const urls = [
            "dist/img/green_sky_front.png",  //x+
            "dist/img/green_sky_back.png",   //x-
            "dist/img/green_sky_left.png",   //y+
            "dist/img/green_sky_right.png",  //y-
            "dist/img/green_sky_bottom.png", //z+
            "dist/img/green_sky_top.png",    //z-
        ]
        this.sky_texture = new CubeMapMaterial();
        await this.sky_texture.initialize(this.device, urls);
    }

    async makeBindGroups() {

        this.ray_tracing_bind_group = this.device.createBindGroup({
            layout: this.ray_tracing_bind_group_layout,
            entries: [
                {
                    binding: 0,
                    resource: this.color_buffer_view
                },
                {
                    binding: 1,
                    resource: {
                        buffer: this.sceneParameters,
                    }
                },
                {
                    binding: 2,
                    resource: {
                        buffer: this.triangleBuffer,
                    }
                },
                {
                    binding: 3,
                    resource: {
                        buffer: this.nodeBuffer,
                    }
                },
                {
                    binding: 4,
                    resource: {
                        buffer: this.triangleIndexBuffer,
                    }
                },
                {
                    binding: 5,
                    resource: this.sky_texture.view,
                },
                {
                    binding: 6,
                    resource: this.sky_texture.sampler,
                },
            ]
        });

        this.screen_bind_group = this.device.createBindGroup({
            layout: this.screen_bind_group_layout,
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
        
        const ray_tracing_pipeline_layout = this.device.createPipelineLayout({
            bindGroupLayouts: [this.ray_tracing_bind_group_layout]
        });

        this.ray_tracing_pipeline = 
            this.device.createComputePipeline(
                {
                    layout: ray_tracing_pipeline_layout,
            
                    compute: {
                        module: this.device.createShaderModule({code: raytracer_kernel,}),
                        entryPoint: 'main',
                    },
                }
            );

        const screen_pipeline_layout = this.device.createPipelineLayout({
            bindGroupLayouts: [this.screen_bind_group_layout]
        });

        this.screen_pipeline = this.device.createRenderPipeline({
            layout: screen_pipeline_layout,
            
            vertex: {
                module: this.device.createShaderModule({
                code: screen_shader,
            }),
            entryPoint: 'vert_main',
            },

            fragment: {
                module: this.device.createShaderModule({
                code: screen_shader,
            }),
            entryPoint: 'frag_main',
            targets: [
                {
                    format: "bgra8unorm"
                }
            ]
            },

            primitive: {
                topology: "triangle-list"
            }
        });
        
    }

    prepareScene() {

        //TODO: add inverse model transform
        const sceneData = {
            cameraPos: this.scene.camera.position,
            cameraForwards: this.scene.camera.forwards,
            cameraRight: this.scene.camera.right,
            cameraUp: this.scene.camera.up,
            triangleCount: this.scene.triangleCount,
            inverseModel: this.scene.statue.inverseModel,
        }
        const maxBounces: number = 4;
        this.device.queue.writeBuffer(
            this.sceneParameters, 0,
            new Float32Array(
                [
                    sceneData.cameraPos[0],
                    sceneData.cameraPos[1],
                    sceneData.cameraPos[2],
                    0.0,
                    sceneData.cameraForwards[0],
                    sceneData.cameraForwards[1],
                    sceneData.cameraForwards[2],
                    0.0,
                    sceneData.cameraRight[0],
                    sceneData.cameraRight[1],
                    sceneData.cameraRight[2],
                    maxBounces,
                    sceneData.cameraUp[0],
                    sceneData.cameraUp[1],
                    sceneData.cameraUp[2],
                    sceneData.triangleCount
                ]
            ), 0, 16
        )
        this.device.queue.writeBuffer(this.sceneParameters, 64,
            <ArrayBuffer>(<unknown>sceneData.inverseModel));

        if (this.loaded) {
            return;
        }
        this.loaded = true;
        const triangleData: Float32Array = new Float32Array(28 * this.scene.triangleCount);
        for (let i = 0; i < this.scene.triangleCount; i++) {
            for (var corner = 0; corner < 3; corner++) {
                triangleData[28*i + 8 * corner]     = this.scene.triangles[i].corners[corner][0];
                triangleData[28*i + 8 * corner + 1] = this.scene.triangles[i].corners[corner][1];
                triangleData[28*i + 8 * corner + 2] = this.scene.triangles[i].corners[corner][2];
                triangleData[28*i + 8 * corner + 3] = 0.0;

                triangleData[28*i + 8 * corner + 4] = this.scene.triangles[i].normals[corner][0];
                triangleData[28*i + 8 * corner + 5] = this.scene.triangles[i].normals[corner][1];
                triangleData[28*i + 8 * corner + 6] = this.scene.triangles[i].normals[corner][2];
                triangleData[28*i + 8 * corner + 7] = 0.0;
            }
            for (var channel = 0; channel < 3; channel++) {
                triangleData[28*i + 24 + channel] = this.scene.triangles[i].color[channel];
            }
            triangleData[28*i + 27] = 0.0;
        }
        this.device.queue.writeBuffer(this.triangleBuffer, 0,
            <ArrayBuffer>(<unknown>triangleData),
            0, 28 * this.scene.triangleCount);

        const nodeData: Float32Array = new Float32Array(8 * this.scene.nodesUsed);
        for (let i = 0; i < this.scene.nodesUsed; i++) {
            nodeData[8*i] = this.scene.nodes[i].minCorner[0];
            nodeData[8*i + 1] = this.scene.nodes[i].minCorner[1];
            nodeData[8*i + 2] = this.scene.nodes[i].minCorner[2];
            nodeData[8*i + 3] = this.scene.nodes[i].leftChild;
            nodeData[8*i + 4] = this.scene.nodes[i].maxCorner[0];
            nodeData[8*i + 5] = this.scene.nodes[i].maxCorner[1];
            nodeData[8*i + 6] = this.scene.nodes[i].maxCorner[2];
            nodeData[8*i + 7] = this.scene.nodes[i].primitiveCount;
        }
        this.device.queue.writeBuffer(this.nodeBuffer, 0,
            <ArrayBuffer>(<unknown>nodeData),
            0, 8 * this.scene.nodesUsed);

        const triangleIndexData: Uint32Array = new Uint32Array(this.scene.triangleCount);
        for (let i = 0; i < this.scene.triangleCount; i++) {
            triangleIndexData[i] = this.scene.triangleIndices[i];
        }
        this.device.queue.writeBuffer(this.triangleIndexBuffer, 0,
            <ArrayBuffer>(<unknown>triangleIndexData),
            0, this.scene.triangleCount);
    }

    render = () => {

        let start: number = performance.now();

        this.scene.update(this.frametime);

        this.prepareScene();

        const commandEncoder : GPUCommandEncoder = this.device.createCommandEncoder();

        const ray_trace_pass : GPUComputePassEncoder = commandEncoder.beginComputePass();
        ray_trace_pass.setPipeline(this.ray_tracing_pipeline);
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

        renderpass.setPipeline(this.screen_pipeline);
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