export class Material {
    
    texture: GPUTexture
    view: GPUTextureView
    sampler: GPUSampler
    bindGroup: GPUBindGroup;

    async initialize(device: GPUDevice, name: string, bindGroupLayout: GPUBindGroupLayout) {

        var mipCount = 0;
        var width = 0;
        var height = 0;

        while (true) {
            const filename: string = "dist/img/" + name + "/" + name + String(mipCount) + ".png";
            const response: Response = await fetch(filename);

            if (mipCount == 0) {
                const blob: Blob = await response.blob();
                const imageData: ImageBitmap = await createImageBitmap(blob);
                width = imageData.width;
                height = imageData.height;
                imageData.close();
            }
            
            if (!response.ok) {
                break;
            }
            mipCount += 1;
        }

        const textureDescriptor: GPUTextureDescriptor = {
            size: {
                width: width,
                height: height
            },
            mipLevelCount: mipCount,
            format: "rgba8unorm",
            usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST | GPUTextureUsage.RENDER_ATTACHMENT
        };

        this.texture = device.createTexture(textureDescriptor);

        for (var i = 0; i < mipCount; i += 1) {
            const filename: string = "dist/img/" + name + "/" + name + String(i) + ".png";
            const response: Response = await fetch(filename);
            const blob: Blob = await response.blob();
            const imageData: ImageBitmap = await createImageBitmap(blob);
            await this.loadImageBitmap(device, imageData, i);
            imageData.close();
        }

        const viewDescriptor: GPUTextureViewDescriptor = {
            format: "rgba8unorm",
            dimension: "2d",
            aspect: "all",
            baseMipLevel: 0,
            mipLevelCount: mipCount,
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
            maxAnisotropy: 4
        };
        this.sampler = device.createSampler(samplerDescriptor);

        this.bindGroup = device.createBindGroup({
            layout: bindGroupLayout,
            entries: [
                {
                    binding: 0,
                    resource: this.view
                },
                {
                    binding: 1,
                    resource: this.sampler
                }
            ]
        });
        
    }

    async loadImageBitmap(device: GPUDevice, imageData: ImageBitmap, mipLevel: number) {

        device.queue.copyExternalImageToTexture(
            {source: imageData},
            {
                texture: this.texture,
                mipLevel: mipLevel
            },
            {   
                width: imageData.width,
                height: imageData.height
            }
        );
    }
}