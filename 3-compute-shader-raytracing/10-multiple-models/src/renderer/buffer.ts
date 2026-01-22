import { Partition } from "./partition";

/**
 * Manages a large webgpu buffer, supports sub-allocation of resources.
 */
export class Buffer {

    device: GPUDevice;

    deviceMemory: GPUBuffer;
    usage: number;
    size: number;

    // Represents an entire "bindable" resource
    coarse_partitions: Partition[];
    hostMemories: Float32Array[];

    // Represents a writable sub-region of a bindable resource
    fine_partitions: Partition[][];

    constructor(device: GPUDevice){
        this.device = device;
        this.usage = 0;

        this.size = 0;

        this.coarse_partitions = [];
        this.hostMemories = [];

        this.fine_partitions = [];
    }

    /**
     * Declare a new bindable resource to be stored on this buffer.
     * @param size size of resource (in bytes)
     * @param usage usage of the resource
     * @returns the index of the resource within the buffer
     */
    add_coarse_partition(size: number, usage: number): number {

        let offset = this.size;
        this.size += size;
        this.usage |= usage;
        let limits = this.device.limits;
        console.log("Add Coarse Partition");
        if (usage & GPUBufferUsage.STORAGE) {
            let alignment = limits.minStorageBufferOffsetAlignment;
            let padding = (alignment - (offset & alignment - 1)) & alignment - 1;
            this.size += padding;
            offset += padding;
            console.log("Required Alignment: %d, Padding: %d", alignment, padding);
        }
        if (usage & GPUBufferUsage.UNIFORM) {
            let alignment = limits.minUniformBufferOffsetAlignment;
            let padding = (alignment - (offset & alignment - 1)) & alignment - 1;
            this.size += padding;
            offset += padding;
            console.log("Required Alignment: %d, Padding: %d", alignment, padding);
        }
        this.coarse_partitions.push(new Partition(offset, size, []));
        this.hostMemories.push(new Float32Array(size / 4));
        this.fine_partitions.push([]);

        return this.coarse_partitions.length - 1;
    }

    /**
     * Actually creates the buffer.
     */
    async Initialize() {

        const descriptor = {
            size: this.size,
            usage: this.usage,
        };

        this.deviceMemory = this.device.createBuffer(descriptor);
    }

    /**
     * Add a region of writable memory to an existing coarse partition.
     * @param parent_index index of the coarse partition to target
     * @param size the number of elements (not bytes!) to allocate
     * @param payload custom data to associate with this region
     * @returns the associated partition index
     */
    add_fine_partition(parent_index: number, size: number, payload: number[]): number {

        let fine_partitions = this.fine_partitions[parent_index];
        let partition_index = fine_partitions.length;

        let offset = 0;
        if (partition_index > 0) {
            let last_region = fine_partitions[partition_index - 1];
            offset = last_region.offset + last_region.size;
        }
        fine_partitions.push(new Partition(offset, size, payload));

        return partition_index;
    }

    /**
     * Copy some memory into a coarse partition.
     * It's recommended to use fine partitions for readability, but:
     * 1. This is a quick fix for cases where fine-grained partitioning isn't used
     * 2. Sometimes memory is uploaded in incredibly small lots (per-object basis)
     */
    blit_to_coarse_partition(coarse_index: number, src: Float32Array, offset: number) {

        let host_memory = this.hostMemories[coarse_index];

        host_memory.set(src, offset);
    }

    /**
     * Upload an entire coarse partition to the GPU.
     */
    upload_coarse_partition(coarse_index: number) {
        
        let buffer_offset = 0;
        let host_memory = this.hostMemories[coarse_index];
        let host_offset = 0;
        let host_size = host_memory.length;
        this.device.queue.writeBuffer(this.deviceMemory, buffer_offset,
            <ArrayBuffer>(<unknown>host_memory), host_offset, host_size);
    }

    get_fine_partition(coarse_index: number, fine_index: number): Partition {
        return this.fine_partitions[coarse_index][fine_index];
    }

    get_coarse_partition(coarse_index: number): Partition {
        return this.coarse_partitions[coarse_index];
    }

    /**
     * Copy memory to the given region. src should cover the region entirely,
     * otherwise errors may occur.
     */
    blit_to_fine_partition(coarse_index: number, fine_index: number, src: Float32Array) {

        let host_memory = this.hostMemories[coarse_index];
        let partition = this.fine_partitions[coarse_index][fine_index];
        let offset = partition.offset;

        host_memory.set(src, offset);
    }

    upload_fine_partition(coarse_index: number, fine_index: number) {
        let coarse_partition = this.coarse_partitions[coarse_index];
        let fine_partition = this.fine_partitions[coarse_index][fine_index];
        let buffer_offset = coarse_partition.offset + 4 * fine_partition.offset;
        let src_offset = fine_partition.offset;
        let src_size = fine_partition.size;
        let host_memory = this.hostMemories[coarse_index];

        this.device.queue.writeBuffer(this.deviceMemory, buffer_offset,
            <ArrayBuffer>(<unknown>host_memory), src_offset, src_size);
    }
    
}