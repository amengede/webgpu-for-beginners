export class Material {
    
    texture: GPUTexture
    view: GPUTextureView
    sampler: GPUSampler

    async initialize(device: GPUDevice, url: string) {

        const response: Response = await fetch(url);
        const blob: Blob = await response.blob();
        const imageData: ImageBitmap = await createImageBitmap(blob);

        await this.loadImageBitmap(device, imageData);

        const viewDescriptor: GPUTextureViewDescriptor = {
            format: "rgba8unorm",
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
            minFilter: "nearest",
            mipmapFilter: "nearest",
            maxAnisotropy: 1
        };
        this.sampler = device.createSampler(samplerDescriptor);
        
    }

    async loadImageBitmap(device: GPUDevice, imageData: ImageBitmap) {

        const textureDescriptor: GPUTextureDescriptor = {
            size: {
                width: imageData.width,
                height: imageData.height
            },
            format: "rgba8unorm",
            usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST | GPUTextureUsage.RENDER_ATTACHMENT
        };

        this.texture = device.createTexture(textureDescriptor);

        device.queue.copyExternalImageToTexture(
            {source: imageData},
            {texture: this.texture},
            textureDescriptor.size
        );
    }
}