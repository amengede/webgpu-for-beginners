import { BindGroupBuilder } from "./bind_group";

export class Framebuffer {
    
    texture: GPUTexture
    view: GPUTextureView
    sampler: GPUSampler
    bindGroup: GPUBindGroup;

    async initialize(device: GPUDevice, canvas: HTMLCanvasElement, 
        bindGroupLayout: GPUBindGroupLayout, format: GPUTextureFormat) {

        var width = canvas.width;
        var height = canvas.height;

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
            mipmapFilter: "linear",
            maxAnisotropy: 1
        };
        this.sampler = device.createSampler(samplerDescriptor);

        var builder: BindGroupBuilder = new BindGroupBuilder(device);
        builder.setLayout(bindGroupLayout);
        builder.addMaterial(this.view, this.sampler);
        this.bindGroup = await builder.build();
        
    }
}