import shader from "./shaders/shaders.wgsl";
import { TriangleMesh } from "./triangle_mesh";
import { mat4 } from "gl-matrix";
import { Material } from "./material";

export class Renderer {

    canvas: HTMLCanvasElement;

    // Device/Context objects
    adapter: GPUAdapter;
    device: GPUDevice;
    context: GPUCanvasContext;
    format : GPUTextureFormat;

    // Pipeline objects
    uniformBuffer: GPUBuffer;
    bindGroup: GPUBindGroup;
    pipeline: GPURenderPipeline;

    // Assets
    triangleMesh: TriangleMesh;
    material: Material;

    //a little dodgy but let's do this for not
    t: number = 0.0;


    constructor(canvas: HTMLCanvasElement){
        this.canvas = canvas;
        this.t = 0.0;
    }

   async Initialize() {

        await this.setupDevice();

        await this.createAssets();
    
        await this.makePipeline();

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

    async makePipeline() {

        this.uniformBuffer = this.device.createBuffer({
            size: 64 * 3,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
        });

        const bindGroupLayout = this.device.createBindGroupLayout({
            entries: [
                {
                    binding: 0,
                    visibility: GPUShaderStage.VERTEX,
                    buffer: {}
                },
                {
                    binding: 1,
                    visibility: GPUShaderStage.FRAGMENT,
                    texture: {}
                },
                {
                    binding: 2,
                    visibility: GPUShaderStage.FRAGMENT,
                    sampler: {}
                },
            ]

        });
    
        this.bindGroup = this.device.createBindGroup({
            layout: bindGroupLayout,
            entries: [
                {
                    binding: 0,
                    resource: {
                        buffer: this.uniformBuffer
                    }
                },
                {
                    binding: 1,
                    resource: this.material.view
                },
                {
                    binding: 2,
                    resource: this.material.sampler
                }
            ]
        });
        
        const pipelineLayout = this.device.createPipelineLayout({
            bindGroupLayouts: [bindGroupLayout]
        });
    
        this.pipeline = this.device.createRenderPipeline({
            vertex : {
                module : this.device.createShaderModule({
                    code : shader
                }),
                entryPoint : "vs_main",
                buffers: [this.triangleMesh.bufferLayout,]
            },
    
            fragment : {
                module : this.device.createShaderModule({
                    code : shader
                }),
                entryPoint : "fs_main",
                targets : [{
                    format : this.format
                }]
            },
    
            primitive : {
                topology : "triangle-list"
            },
    
            layout: pipelineLayout
        });

    }

    async createAssets() {
        this.triangleMesh = new TriangleMesh(this.device);
        this.material = new Material();

        await this.material.initialize(this.device, "dist/img/chat.jpg");
    }

    render = () => {
        
        this.t += 0.01;
        if (this.t > 2.0 * Math.PI) {
            this.t -= 2.0 * Math.PI;
        }
        

        //make transforms
        const projection = mat4.create();
        // load perspective projection into the projection matrix,
        // Field of view = 45 degrees (pi/4)
        // Aspect ratio = 800/600
        // near = 0.1, far = 10 
        mat4.perspective(projection, Math.PI/4, 800/600, 0.1, 10);

        const view = mat4.create();
        //load lookat matrix into the view matrix,
        //looking from [-2, 0, 2]
        //looking at [0, 0, 0]
        //up vector is [0, 0, 1]
        mat4.lookAt(view, [-2, 0, 2], [0, 0, 0], [0, 0, 1]);

        const model = mat4.create();
        //Store, in the model matrix, the model matrix after rotating it by t radians around the z axis.
        //(yeah, I know, kinda weird.)
        mat4.rotate(model, model, this.t, [0,0,1]);
        

        this.device.queue.writeBuffer(this.uniformBuffer, 0, <ArrayBuffer>model); 
        this.device.queue.writeBuffer(this.uniformBuffer, 64, <ArrayBuffer>view); 
        this.device.queue.writeBuffer(this.uniformBuffer, 128, <ArrayBuffer>projection); 

        //command encoder: records draw commands for submission
        const commandEncoder : GPUCommandEncoder = this.device.createCommandEncoder();
        //texture view: image view to the color buffer in this case
        const textureView : GPUTextureView = this.context.getCurrentTexture().createView();
        //renderpass: holds draw commands, allocated from command encoder
        const renderpass : GPURenderPassEncoder = commandEncoder.beginRenderPass({
            colorAttachments: [{
                view: textureView,
                clearValue: {r: 0.5, g: 0.0, b: 0.25, a: 1.0},
                loadOp: "clear",
                storeOp: "store"
            }]
        });
        
        renderpass.setPipeline(this.pipeline);
        renderpass.setVertexBuffer(0, this.triangleMesh.buffer);
        renderpass.setBindGroup(0, this.bindGroup);
        renderpass.draw(3, 1, 0, 0);
        renderpass.end();
    
        this.device.queue.submit([commandEncoder.finish()]);

        requestAnimationFrame(this.render);
    }
    
}