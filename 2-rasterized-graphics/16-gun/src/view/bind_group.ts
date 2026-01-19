export class BindGroupBuilder {

    device: GPUDevice;
    layout: GPUBindGroupLayout;
    entries: GPUBindGroupEntry[];
    binding: number;

    constructor(device: GPUDevice) {
        this.device = device;
        this.reset();
    }

    reset() {
        this.entries = [];
        this.binding = 0;
    }

    setLayout(layout: GPUBindGroupLayout) {
        this.layout = layout;
    }

    addBuffer(buffer: GPUBuffer) {
        this.entries.push({
            binding: this.binding,
            resource: {
                buffer: buffer
            }
        });
        this.binding += 1;
    }

    addMaterial(view: GPUTextureView, sampler: GPUSampler) {
        
        this.entries.push({
            binding: this.binding,
            resource: view
        });
        this.binding += 1;

        this.entries.push({
            binding: this.binding,
            resource: sampler
        });
        this.binding += 1;
    }

    async build(): Promise<GPUBindGroup> {

        const bindGroup = await this.device.createBindGroup({
            layout: this.layout,
            entries: this.entries
        });

        this.reset();

        return bindGroup;
    }
}