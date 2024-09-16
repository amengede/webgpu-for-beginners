export class Buffer {

    device: GPUDevice;

    hostMemory: Float32Array;
    deviceMemory: GPUBuffer;
    usage: number;

    constructor(device: GPUDevice, usage: number, size: number){
        this.device = device;
        this.usage = usage;
        this.hostMemory = new Float32Array(size)
    }

    async Initialize() {

        const descriptor = {
            size: this.hostMemory.length * 4,
            usage: this.usage,
        };

        this.deviceMemory = this.device.createBuffer(descriptor);
    }

    blit(src: Float32Array, offset: number) {
        for (let i = 0; i < src.length; i++) {
            this.hostMemory[offset + i] = src[i];
        }
    }

    upload() {
        this.device.queue.writeBuffer(this.deviceMemory, 0, this.hostMemory, 0, this.hostMemory.length);
    }
    
}