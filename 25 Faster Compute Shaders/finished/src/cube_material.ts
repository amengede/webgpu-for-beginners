export class CubeMapMaterial {
    
    texture: GPUTexture
    view: GPUTextureView
    sampler: GPUSampler

    async initialize(
        device: GPUDevice, 
        urls: string[]) {

        var imageData: ImageBitmap[] = new Array(6);

        for(var i: number = 0; i < 6; i++) {
            const response: Response = await fetch(urls[i]);
            const blob: Blob = await response.blob();
            imageData[i] = await createImageBitmap(blob);
        }
        await this.loadImageBitmaps(device, imageData);

        const viewDescriptor: GPUTextureViewDescriptor = {
            format: "rgba8unorm",
            dimension: "cube",
            aspect: "all",
            baseMipLevel: 0,
            mipLevelCount: 1,
            baseArrayLayer: 0,
            arrayLayerCount: 6
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

    async loadImageBitmaps(
        device: GPUDevice, 
        imageData: ImageBitmap[]) {

        const textureDescriptor: GPUTextureDescriptor = {
            dimension: "2d",
            size: {
                width: imageData[0].width,
                height: imageData[0].height,
                depthOrArrayLayers: 6
            },
            format: "rgba8unorm",
            usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST | GPUTextureUsage.RENDER_ATTACHMENT
        };

        this.texture = device.createTexture(textureDescriptor);

        for (var i = 0; i < 6; i++) {
            device.queue.copyExternalImageToTexture(
                {source: imageData[i]},
                {texture: this.texture, origin: [0, 0, i]},
                [imageData[i].width, imageData[i].height]
            );
        }
    }
}