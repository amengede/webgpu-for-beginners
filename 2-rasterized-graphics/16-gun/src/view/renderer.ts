import sky_shader from "./shaders/sky_shader.wgsl";
import shader from "./shaders/shaders.wgsl";
import post_shader from "./shaders/post_shader.wgsl"
import screen_shader from "./shaders/screen_shader.wgsl"
import gun_shader from "./shaders/gun_shader.wgsl"
import { TriangleMesh } from "./triangle_mesh";
import { QuadMesh } from "./quad_mesh";
import { mat4, vec3 } from "gl-matrix";
import { Material } from "./material";
import { pipeline_types, object_types, RenderData } from "../model/definitions";
import { ObjMesh } from "./obj_mesh";
import { CubeMapMaterial } from "./cube_material";
import { Camera } from "../model/camera";
import { BindGroupLayoutBuilder } from "./bind_group_layout";
import { BindGroupBuilder } from "./bind_group";
import { RenderPipelineBuilder } from "./pipeline";
import { Framebuffer } from "./framebuffer";
import { Deg2Rad } from '../model/math_stuff';

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

    // Assets
    triangleMesh: TriangleMesh;
    quadMesh: QuadMesh;
    statueMesh: ObjMesh;
    triangleMaterial: Material;
    quadMaterial: Material;
    objectBuffer: GPUBuffer;
    parameterBuffer: GPUBuffer;
    skyMaterial: CubeMapMaterial;
    frameBuffer: Framebuffer;
    hudMaterial: Material;
    gunFrameBuffer: Framebuffer;
    gunMesh: ObjMesh;
    gunMaterial: Material;

    constructor(canvas: HTMLCanvasElement){
        this.canvas = canvas;

        this.pipelines = {
            [pipeline_types.SKY]: null,
            [pipeline_types.STANDARD]: null,
            [pipeline_types.POST]: null,
            [pipeline_types.HUD]: null,
            [pipeline_types.GUN]: null,
        }

        this.frameGroupLayouts = {
            [pipeline_types.SKY]: null,
            [pipeline_types.STANDARD]: null,
            [pipeline_types.POST]: null,
            [pipeline_types.HUD]: null,
            [pipeline_types.GUN]: null,
        }

        this.frameBindGroups = {
            [pipeline_types.SKY]: null,
            [pipeline_types.STANDARD]: null,
            [pipeline_types.POST]: null,
            [pipeline_types.HUD]: null,
            [pipeline_types.GUN]: null,
        }
    }

   async Initialize() {

        await this.setupDevice();

        await this.makeBindGroupLayouts();

        await this.createAssets();
    
        await this.makePipelines();

        await this.makeBindGroups();
    }

    async setupDevice() {

        this.adapter = <GPUAdapter> await navigator.gpu?.requestAdapter();
        this.device = <GPUDevice> await this.adapter?.requestDevice();
        this.context = <GPUCanvasContext> this.canvas.getContext("webgpu");
        this.format = "bgra8unorm";
        this.context.configure({
            device: this.device,
            format: this.format,
            alphaMode: "opaque"
        });

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
        this.materialGroupLayout = await builder.build();

        builder.addMaterial(GPUShaderStage.FRAGMENT, "2d");
        this.frameGroupLayouts[pipeline_types.HUD] = await builder.build();

        builder.addBuffer(GPUShaderStage.VERTEX, "uniform");
        this.frameGroupLayouts[pipeline_types.GUN] = await builder.build();

    }

    async makePipelines() {

        var builder: RenderPipelineBuilder = new RenderPipelineBuilder(this.device);

        builder.addBindGroupLayout(this.materialGroupLayout);
        builder.setSourceCode(post_shader, "vert_main", "frag_main");
        builder.addRenderTarget(this.format, false);
        this.pipelines[pipeline_types.POST] = await builder.build("POST");

        builder.addBindGroupLayout(this.materialGroupLayout);
        builder.setSourceCode(screen_shader, "vert_main", "frag_main");
        builder.addRenderTarget(this.format, true);
        this.pipelines[pipeline_types.HUD] = await builder.build("HUD");

        builder.addBindGroupLayout(this.frameGroupLayouts[pipeline_types.STANDARD] as GPUBindGroupLayout);
        builder.addBindGroupLayout(this.materialGroupLayout);
        builder.setSourceCode(shader, "vs_main", "fs_main");
        builder.addVertexBufferDescription(this.triangleMesh.bufferLayout);
        builder.setDepthStencilState(this.frameBuffer.depthStencilState);
        builder.addRenderTarget(this.format, false);
        this.pipelines[pipeline_types.STANDARD] = await builder.build("STANDARD");

        builder.addBindGroupLayout(this.frameGroupLayouts[pipeline_types.GUN] as GPUBindGroupLayout);
        builder.addBindGroupLayout(this.materialGroupLayout);
        builder.setSourceCode(gun_shader, "vs_main", "fs_main");
        builder.addVertexBufferDescription(this.gunMesh.bufferLayout);
        builder.setDepthStencilState(this.gunFrameBuffer.depthStencilState);
        builder.addRenderTarget(this.format, false);
        this.pipelines[pipeline_types.GUN] = await builder.build("GUN");

        builder.addBindGroupLayout(this.frameGroupLayouts[pipeline_types.SKY] as GPUBindGroupLayout);
        builder.setSourceCode(sky_shader, "sky_vert_main", "sky_frag_main");
        builder.addRenderTarget(this.format, true);
        this.pipelines[pipeline_types.SKY] = await builder.build("SCREEN");
    }

    async createAssets() {
        this.triangleMesh = new TriangleMesh(this.device);
        this.quadMesh = new QuadMesh(this.device);
        this.statueMesh = new ObjMesh();
        var preTransform: mat4 = mat4.create();
        await this.statueMesh.initialize(this.device, "dist/models/statue.obj", 
            true, true, false, preTransform);
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
            "dist/img/sky_back.png",  //x+
            "dist/img/sky_front.png",   //x-
            "dist/img/sky_left.png",   //y+
            "dist/img/sky_right.png",  //y-
            "dist/img/sky_top.png", //z+
            "dist/img/sky_bottom.png",    //z-
        ]
        this.skyMaterial = new CubeMapMaterial();
        await this.skyMaterial.initialize(this.device, urls);

        this.frameBuffer = new Framebuffer("world layer");
        await this.frameBuffer.initialize(this.device, 
            this.canvas, this.materialGroupLayout, this.format, true);
        
        this.hudMaterial = new Material();
        await this.hudMaterial.initialize(this.device, "hud", this.materialGroupLayout);

        this.gunFrameBuffer = new Framebuffer("gun layer");
        await this.gunFrameBuffer.initialize(this.device, 
            this.canvas, this.materialGroupLayout, this.format, true);
        
        this.gunMesh = new ObjMesh();
        var rotation: mat4 = mat4.create();
        rotation = mat4.fromYRotation(rotation, Deg2Rad(180));
        preTransform = mat4.multiply(preTransform, preTransform, rotation);
        var translate: mat4 = mat4.create();
        translate = mat4.fromTranslation(translate, vec3.fromValues(-0.4, -1.0, 2.0));
        preTransform = mat4.multiply(preTransform, preTransform, translate);
        var scale: mat4 = mat4.create();
        scale = mat4.fromScaling(scale, vec3.fromValues(0.25, 0.25, 0.25));
        preTransform = mat4.multiply(preTransform, preTransform, scale);
        await this.gunMesh.initialize(this.device, "dist/models/gun.obj", 
            true, true, true, preTransform);
        
        this.gunMaterial = new Material();
        await this.gunMaterial.initialize(this.device, "gun", this.materialGroupLayout);
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

        builder.setLayout(this.frameGroupLayouts[pipeline_types.GUN] as GPUBindGroupLayout);
        builder.addBuffer(this.uniformBuffer);
        this.frameBindGroups[pipeline_types.GUN] = await builder.build();
    }

    prepareScene(renderables: RenderData, camera: Camera) {

        //make transforms
        const projection = mat4.create();
        mat4.perspective(projection, Math.PI/4, 800/600, 0.1, 10);

        const view = renderables.view_transform;

        this.device.queue.writeBuffer(
            this.objectBuffer, 0, 
            renderables.model_transforms, 0, 
            renderables.model_transforms.length
        );
        this.device.queue.writeBuffer(this.uniformBuffer, 0, <ArrayBuffer>view); 
        this.device.queue.writeBuffer(this.uniformBuffer, 64, <ArrayBuffer>projection); 

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
        
        const commandEncoder : GPUCommandEncoder = this.device.createCommandEncoder();
        
        this.draw_world(renderables, camera, commandEncoder);
        this.draw_gun(commandEncoder);
        this.draw_screen(commandEncoder);
    
        this.device.queue.submit([commandEncoder.finish()]);
    }

    draw_world(renderables: RenderData, 
        camera: Camera, 
        commandEncoder : GPUCommandEncoder) {

        this.prepareScene(renderables, camera)
        
        const renderpass : GPURenderPassEncoder = this.frameBuffer.render_to(commandEncoder);

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

    async draw_gun(commandEncoder : GPUCommandEncoder) {
        
        const renderpass : GPURenderPassEncoder = this.gunFrameBuffer.render_to(commandEncoder);

        renderpass.setPipeline(this.pipelines[pipeline_types.GUN] as GPURenderPipeline);
        renderpass.setVertexBuffer(0, this.gunMesh.buffer);
        renderpass.setBindGroup(0, this.frameBindGroups[pipeline_types.GUN]);
        renderpass.setBindGroup(1, this.gunMaterial.bindGroup);
        renderpass.draw(this.gunMesh.vertexCount, 1, 0, 0);

        renderpass.end();
    }

    async draw_screen(commandEncoder : GPUCommandEncoder) {
        
        //texture view: image view to the color buffer in this case
        const textureView : GPUTextureView = this.context.getCurrentTexture().createView();
        //renderpass: holds draw commands, allocated from command encoder
        const renderpass : GPURenderPassEncoder = commandEncoder.beginRenderPass({
            colorAttachments: [{
                view: textureView,
                loadOp: "clear",
                storeOp: "store",
                clearValue: {r: 0.1, g: 0.2, b: 0.4, a: 1.0}
            }],
        });

        // World
        renderpass.setPipeline(this.pipelines[pipeline_types.POST] as GPURenderPipeline);
        this.frameBuffer.read_from(renderpass, 0);
        renderpass.draw(6, 1, 0, 0);

        // Gun
        renderpass.setPipeline(this.pipelines[pipeline_types.POST] as GPURenderPipeline);
        this.gunFrameBuffer.read_from(renderpass, 0);
        renderpass.draw(6, 1, 0, 0);

        // HUD
        renderpass.setPipeline(this.pipelines[pipeline_types.HUD] as GPURenderPipeline);
        renderpass.setBindGroup(0, this.hudMaterial.bindGroup);
        renderpass.draw(6, 1, 0, 0);

        renderpass.end();
    }
}