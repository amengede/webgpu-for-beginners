import sky_shader from "./shaders/sky_shader.wgsl";
import shader from "./shaders/shaders.wgsl";
import post from "./shaders/post.wgsl";
import { TriangleMesh } from "./triangle_mesh";
import { QuadMesh } from "./quad_mesh";
import { mat4 } from "gl-matrix";
import { Material } from "./material";
import { pipeline_types, object_types, RenderData } from "../model/definitions";
import { ObjMesh } from "./obj_mesh";
import { CubeMapMaterial } from "./cube_material";
import { Camera } from "../model/camera";
import { BindGroupLayoutBuilder } from "./bind_group_layout";
import { BindGroupBuilder } from "./bind_group";
import { RenderPipelineBuilder } from "./pipeline";
import { Framebuffer } from "./framebuffer";

export class Renderer {

    canvas: HTMLCanvasElement;

    // Device/Context objects
    adapter: GPUAdapter;
    device: GPUDevice;
    context: GPUCanvasContext;
    format : GPUTextureFormat;

    // Pipeline objects
    uniformBuffer: GPUBuffer;
    pipelines: {[pipeline in pipeline_types]: GPURenderPipeline | null};
    frameGroupLayouts: {[pipeline in pipeline_types]: GPUBindGroupLayout | null};
    materialGroupLayout: GPUBindGroupLayout;
    frameBindGroups: {[pipeline in pipeline_types]: GPUBindGroup | null};

    // Depth Stencil stuff
    depthStencilState: GPUDepthStencilState;
    depthStencilBuffer: GPUTexture;
    depthStencilView: GPUTextureView;
    depthStencilAttachment: GPURenderPassDepthStencilAttachment;

    // Assets
    triangleMesh: TriangleMesh;
    quadMesh: QuadMesh;
    statueMesh: ObjMesh;
    triangleMaterial: Material;
    quadMaterial: Material;
    objectBuffer: GPUBuffer;
    parameterBuffer: GPUBuffer;
    skyMaterial: CubeMapMaterial;
    framebuffer: Framebuffer;

    constructor(canvas: HTMLCanvasElement){
        this.canvas = canvas;

        this.pipelines = {
            [pipeline_types.SKY]: null,
            [pipeline_types.STANDARD]: null,
            [pipeline_types.POST]: null,
        }

        this.frameGroupLayouts = {
            [pipeline_types.SKY]: null,
            [pipeline_types.STANDARD]: null,
            [pipeline_types.POST]: null,
        }

        this.frameBindGroups = {
            [pipeline_types.SKY]: null,
            [pipeline_types.STANDARD]: null,
            [pipeline_types.POST]: null,
        }
    }

   async Initialize() {

        await this.setupDevice();

        await this.makeBindGroupLayouts();

        await this.createAssets();

        await this.makeDepthBufferResources();
    
        await this.makePipelines();

        await this.makeBindGroups();
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

    async makeDepthBufferResources() {

        this.depthStencilState = {
            format: "depth24plus-stencil8",
            depthWriteEnabled: true,
            depthCompare: "less-equal",
        };

        const size: GPUExtent3D = {
            width: this.canvas.width,
            height: this.canvas.height,
            depthOrArrayLayers: 1
        };
        const depthBufferDescriptor: GPUTextureDescriptor = {
            size: size,
            format: "depth24plus-stencil8",
            usage: GPUTextureUsage.RENDER_ATTACHMENT,
        }
        this.depthStencilBuffer = this.device.createTexture(depthBufferDescriptor);

        const viewDescriptor: GPUTextureViewDescriptor = {
            format: "depth24plus-stencil8",
            dimension: "2d",
            aspect: "all"
        };
        this.depthStencilView = this.depthStencilBuffer.createView(viewDescriptor);
        
        this.depthStencilAttachment = {
            view: this.depthStencilView,
            depthClearValue: 1.0,
            depthLoadOp: "clear",
            depthStoreOp: "store",

            stencilLoadOp: "clear",
            stencilStoreOp: "discard"
        };

    }

    async makeBindGroupLayouts() {

        var builder = new BindGroupLayoutBuilder(this.device);

        builder.addBuffer(GPUShaderStage.VERTEX, "uniform");
        builder.addMaterial(GPUShaderStage.FRAGMENT, "cube");
        this.frameGroupLayouts[pipeline_types.SKY] = await builder.build();

        builder.addBuffer(GPUShaderStage.VERTEX, "uniform");
        builder.addBuffer(GPUShaderStage.VERTEX, "read-only-storage");
        this.frameGroupLayouts[pipeline_types.STANDARD] = await builder.build();

        builder.addMaterial(GPUShaderStage.FRAGMENT, "2d");
        this.frameGroupLayouts[pipeline_types.POST] = await builder.build();

        builder.addMaterial(GPUShaderStage.FRAGMENT, "2d");
        this.materialGroupLayout = await builder.build();

    }

    async makePipelines() {

        var builder: RenderPipelineBuilder = new RenderPipelineBuilder(this.device);

        builder.addBindGroupLayout(this.frameGroupLayouts[pipeline_types.POST] as GPUBindGroupLayout);
        builder.setSourceCode(post, "vs_main", "fs_main");
        builder.addColorFormat(this.format);
        this.pipelines[pipeline_types.POST] = await builder.build();

        builder.addBindGroupLayout(this.frameGroupLayouts[pipeline_types.STANDARD] as GPUBindGroupLayout);
        builder.addBindGroupLayout(this.materialGroupLayout);
        builder.setSourceCode(shader, "vs_main", "fs_main");
        builder.addVertexBufferDescription(this.triangleMesh.bufferLayout);
        builder.setDepthStencilState(this.depthStencilState);
        this.pipelines[pipeline_types.STANDARD] = await builder.build();

        builder.addBindGroupLayout(this.frameGroupLayouts[pipeline_types.SKY] as GPUBindGroupLayout);
        builder.setSourceCode(sky_shader, "sky_vert_main", "sky_frag_main");
        this.pipelines[pipeline_types.SKY] = await builder.build();
    }

    async createAssets() {
        this.triangleMesh = new TriangleMesh(this.device);
        this.quadMesh = new QuadMesh(this.device);
        this.statueMesh = new ObjMesh();
        await this.statueMesh.initialize(this.device, "dist/models/statue.obj");
        this.triangleMaterial = new Material();
        this.quadMaterial = new Material();

        this.uniformBuffer = this.device.createBuffer({
            size: 64 * 2,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
        });

        const modelBufferDescriptor: GPUBufferDescriptor = {
            size: 64 * 1024,
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
        };
        this.objectBuffer = this.device.createBuffer(modelBufferDescriptor);

        const parameterBufferDescriptor: GPUBufferDescriptor = {
            size: 48,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
        };
        this.parameterBuffer = this.device.createBuffer(
            parameterBufferDescriptor
        );

        await this.triangleMaterial.initialize(this.device, "chat", this.materialGroupLayout);
        await this.quadMaterial.initialize(this.device, "floor", this.materialGroupLayout);

        const urls = [
            "dist/img/red_sky_back.png",  //x+
            "dist/img/red_sky_front.png",   //x-
            "dist/img/red_sky_left.png",   //y+
            "dist/img/red_sky_right.png",  //y-
            "dist/img/red_sky_top.png", //z+
            "dist/img/red_sky_bottom.png",    //z-
        ]
        this.skyMaterial = new CubeMapMaterial();
        await this.skyMaterial.initialize(this.device, urls);

        this.framebuffer = new Framebuffer();
        await this.framebuffer.initialize(this.device, this.canvas, this.materialGroupLayout, this.format);
    }

    async makeBindGroups() {

        var builder: BindGroupBuilder = new BindGroupBuilder(this.device);

        builder.setLayout(this.frameGroupLayouts[pipeline_types.STANDARD] as GPUBindGroupLayout);
        builder.addBuffer(this.uniformBuffer);
        builder.addBuffer(this.objectBuffer);
        this.frameBindGroups[pipeline_types.STANDARD] = await builder.build();

        builder.setLayout(this.frameGroupLayouts[pipeline_types.SKY] as GPUBindGroupLayout);
        builder.addBuffer(this.parameterBuffer);
        builder.addMaterial(this.skyMaterial.view, this.skyMaterial.sampler);
        this.frameBindGroups[pipeline_types.SKY] = await builder.build();
    }

    prepareScene(renderables: RenderData, camera: Camera) {

        //make transforms
        const projection = mat4.create();
        mat4.perspective(projection, Math.PI/4, 800/600, 0.1, 10);

        const view = renderables.view_transform;

        this.device.queue.writeBuffer(
            this.objectBuffer, 0, 
            <ArrayBuffer>(<unknown>renderables.model_transforms), 0, 
            renderables.model_transforms.length
        );
        this.device.queue.writeBuffer(this.uniformBuffer, 0, <ArrayBuffer>(<unknown>view)); 
        this.device.queue.writeBuffer(this.uniformBuffer, 64, <ArrayBuffer>(<unknown>projection)); 

        const dy = Math.tan(Math.PI/8);
        const dx = dy * 800 / 600

        this.device.queue.writeBuffer(
            this.parameterBuffer, 0,
            new Float32Array(
                [
                    camera.forwards[0],
                    camera.forwards[1],
                    camera.forwards[2],
                    0.0,
                    dx * camera.right[0],
                    dx * camera.right[1],
                    dx * camera.right[2],
                    0.0,
                    dy * camera.up[0],
                    dy * camera.up[1],
                    dy * camera.up[2],
                    0.0
                ]
            ), 0, 12
        )
    }

    async render(renderables: RenderData, camera: Camera) {

        //Early exit tests
        if (!this.device || !this.pipelines[pipeline_types.STANDARD]) {
            return;
        }

        //command encoder: records draw commands for submission
        const commandEncoder : GPUCommandEncoder = this.device.createCommandEncoder();

        this.drawWorld(renderables, camera, commandEncoder);

        this.applyPostProcessing(commandEncoder);
    
        this.device.queue.submit([commandEncoder.finish()]);
    }

    drawWorld(renderables: RenderData, camera: Camera, commandEncoder: GPUCommandEncoder) {

        this.prepareScene(renderables, camera)
        
        //renderpass: holds draw commands, allocated from command encoder
        const renderpass : GPURenderPassEncoder = commandEncoder.beginRenderPass({
            colorAttachments: [{
                view: this.framebuffer.view,
                loadOp: "clear",
                storeOp: "store"
            }],
            depthStencilAttachment: this.depthStencilAttachment,
        });

        renderpass.setPipeline(this.pipelines[pipeline_types.SKY] as GPURenderPipeline);
        renderpass.setBindGroup(0, this.frameBindGroups[pipeline_types.SKY]);

        renderpass.setBindGroup(1, this.quadMaterial.bindGroup); 
        renderpass.draw(6, 1, 0, 0);
        
        renderpass.setPipeline(this.pipelines[pipeline_types.STANDARD] as GPURenderPipeline);
        renderpass.setBindGroup(0, this.frameBindGroups[pipeline_types.STANDARD]);

        var objects_drawn: number = 0;

        //Triangles
        renderpass.setVertexBuffer(0, this.triangleMesh.buffer);
        renderpass.setBindGroup(1, this.triangleMaterial.bindGroup); 
        renderpass.draw(
            3, renderables.object_counts[object_types.TRIANGLE], 
            0, objects_drawn
        );
        objects_drawn += renderables.object_counts[object_types.TRIANGLE];

        //Quads
        renderpass.setVertexBuffer(0, this.quadMesh.buffer);
        renderpass.setBindGroup(1, this.quadMaterial.bindGroup); 
        renderpass.draw(
            6, renderables.object_counts[object_types.QUAD], 
            0, objects_drawn
        );
        objects_drawn += renderables.object_counts[object_types.QUAD];

        //Statue
        renderpass.setVertexBuffer(0, this.statueMesh.buffer);
        renderpass.setBindGroup(1, this.triangleMaterial.bindGroup); 
        renderpass.draw(
            this.statueMesh.vertexCount, 1, 
            0, objects_drawn
        );
        objects_drawn += 1;

        renderpass.end();
    }

    async applyPostProcessing(commandEncoder: GPUCommandEncoder) {

        //texture view: image view to the color buffer in this case
        const textureView : GPUTextureView = this.context.getCurrentTexture().createView();
        //renderpass: holds draw commands, allocated from command encoder
        const renderpass : GPURenderPassEncoder = commandEncoder.beginRenderPass({
            colorAttachments: [{
                view: textureView,
                loadOp: "clear",
                storeOp: "store"
            }],
        });

        renderpass.setPipeline(this.pipelines[pipeline_types.POST] as GPURenderPipeline);
        renderpass.setBindGroup(0, this.framebuffer.bindGroup);
        renderpass.draw(6, 1, 0, 0);

        renderpass.end();
    }
}