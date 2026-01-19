export class BindGroupLayoutBuilder {

    device: GPUDevice;
    bindGroupLayoutEntries: GPUBindGroupLayoutEntry[];
    binding: number;

    constructor(device: GPUDevice) {
        this.device = device;
        this.reset();
    }

    reset() {
        this.bindGroupLayoutEntries = [];
        this.binding = 0;
    }

    addBuffer(visibility: number, type: GPUBufferBindingType) {
        this.bindGroupLayoutEntries.push({
            binding: this.binding,
            visibility: visibility,
            buffer: {
                type: type,
                hasDynamicOffset: false
            }
        });
        this.binding += 1;
    }

    addMaterial(visibility: number, type: GPUTextureViewDimension) {
        this.bindGroupLayoutEntries.push({
            binding: this.binding,
            visibility: visibility,
            texture: {
                viewDimension: type,
            }
        });
        this.binding += 1;

        this.bindGroupLayoutEntries.push({
            binding: this.binding,
            visibility: visibility,
            sampler: {
            }
        });
        this.binding += 1;
    }

    async build(): Promise<GPUBindGroupLayout> {

        const layout: GPUBindGroupLayout = await this.device.createBindGroupLayout({entries: this.bindGroupLayoutEntries});
        this.reset();
        return layout;

    }
}