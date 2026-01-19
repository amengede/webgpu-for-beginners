import { BindGroupBuilder } from "./bind_group";

export class Framebuffer {
    
    texture: GPUTexture;
    view: GPUTextureView;
    sampler: GPUSampler;
    bindGroup: GPUBindGroup;
    colorAttachments: GPURenderPassColorAttachment[];

    depthStencilState: GPUDepthStencilState;
    depthStencilBuffer: GPUTexture;
    depthStencilView: GPUTextureView;
    depthStencilAttachment: GPURenderPassDepthStencilAttachment | undefined;

    name: string;

    constructor(name: string) {
        this.name = name;
    }

    async initialize(device: GPUDevice, 
        canvas: HTMLCanvasElement, 
        bindGroupLayout: GPUBindGroupLayout,
        format: GPUTextureFormat,
        depthEnable: boolean) {

        const width = canvas.width;
        const height = canvas.height;

        const textureDescriptor: GPUTextureDescriptor = {
            size: {
                width: width,
                height: height
            },
            mipLevelCount: 1,
            format: format,
            usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.RENDER_ATTACHMENT
        };
        this.texture = device.createTexture(textureDescriptor);

        const viewDescriptor: GPUTextureViewDescriptor = {
            format: format,
            dimension: "2d",
            aspect: "all",
            baseMipLevel: 0,
            mipLevelCount: 1,
            baseArrayLayer: 0,
            arrayLayerCount: 1
        };
        this.view = this.texture.createView(viewDescriptor);

        const samplerDescriptor: GPUSamplerDescriptor = {
            addressModeU: "repeat",
            addressModeV: "repeat",
            magFilter: "linear",
            minFilter: "linear",
        };
        this.sampler = device.createSampler(samplerDescriptor);

        var builder: BindGroupBuilder = new BindGroupBuilder(device);
        builder.setLayout(bindGroupLayout);
        builder.addMaterial(this.view, this.sampler);
        this.bindGroup = await builder.build();

        this.depthStencilAttachment = undefined;
        if (depthEnable) {
            await this.makeDepthResources(canvas, device);
        }

        this.colorAttachments = [];
        this.colorAttachments.push({
            view: this.view,
            clearValue: {r: 0.0, g: 0.0, b: 0.0, a: 0.0},
            loadOp: "clear",
            storeOp: "store"
        });
    }

    async makeDepthResources(canvas: HTMLCanvasElement, device: GPUDevice) {

        this.depthStencilState = {
            format: "depth24plus-stencil8",
            depthWriteEnabled: true,
            depthCompare: "less-equal",
        };

        const size: GPUExtent3D = {
            width: canvas.width,
            height: canvas.height,
            depthOrArrayLayers: 1
        };
        const depthBufferDescriptor: GPUTextureDescriptor = {
            size: size,
            format: "depth24plus-stencil8",
            usage: GPUTextureUsage.RENDER_ATTACHMENT,
        }
        this.depthStencilBuffer = device.createTexture(depthBufferDescriptor);

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

    render_to(commandEncoder: GPUCommandEncoder): GPURenderPassEncoder {
        return commandEncoder.beginRenderPass({
            label: this.name,
            colorAttachments: this.colorAttachments,
            depthStencilAttachment: this.depthStencilAttachment,
        });
    }

    read_from(renderpass: GPURenderPassEncoder, bindGroupIndex: number) {
        renderpass.setBindGroup(bindGroupIndex, this.bindGroup);
    }
}