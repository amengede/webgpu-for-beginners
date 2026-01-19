export class Pipeline<T> {

    device: GPUDevice;

    pipeline: T
    bind_group_layout: GPUBindGroupLayout
    entries: Array<GPUBindGroupLayoutEntry>;
    
    visibility: number
    binding: number

    constructor(device: GPUDevice, visibility: number){
        this.device = device;
        this.visibility = visibility;
        this.entries = new Array<GPUBindGroupLayoutEntry>();
        this.binding = 0;
    }

    addImage2D() {

        if (this.visibility == GPUShaderStage.COMPUTE){
            this.entries.push({
                binding: this.binding,
                visibility: this.visibility,
                storageTexture: {
                    access: "write-only",
                    format: "rgba8unorm",
                    viewDimension: "2d"
                }
            })
            this.binding += 1;
        }
        else {
            this.entries.push({
                binding: this.binding,
                visibility: this.visibility,
                sampler: {}
            });
            this.binding += 1;
            this.entries.push({
                binding: this.binding,
                visibility: GPUShaderStage.FRAGMENT,
                texture: {}
            });
            this.binding += 1;
        }
    }

    addBuffer(type: string) {

        this.entries.push({
            binding: this.binding,
            visibility: this.visibility,
            buffer: {
                type: type as GPUBufferBindingType,
                hasDynamicOffset: false,
            }
        })
        this.binding += 1;
    }

    addImageCube() {
        this.entries.push({
            binding: this.binding,
            visibility: this.visibility,
            texture: {
                viewDimension: "cube",
            }
        })
        this.binding += 1;

        this.entries.push({
            binding: this.binding,
            visibility: this.visibility,
            sampler: {}
        })
        this.binding += 1;
    }

    async makeBindGroupLayout() {

        this.bind_group_layout = this.device.createBindGroupLayout({entries: this.entries});

    }

    async build(src_code: string, entry_points: string[]) {
        
        const layout = this.device.createPipelineLayout({
            bindGroupLayouts: [this.bind_group_layout]
        });

        if (this.visibility == GPUShaderStage.COMPUTE) {

            this.pipeline = 
                this.device.createComputePipeline(
                    {
                        layout: layout,
                
                        compute: {
                            module: this.device.createShaderModule({code: src_code,}),
                            entryPoint: entry_points[0],
                        },
                    }
                ) as T;
        }
        else {
            this.pipeline = this.device.createRenderPipeline({
                layout: layout,
                
                vertex: {
                    module: this.device.createShaderModule({
                    code: src_code,
                }),
                entryPoint: entry_points[0],
                },

                fragment: {
                    module: this.device.createShaderModule({
                    code: src_code,
                }),
                entryPoint: entry_points[1],
                targets: [
                    {
                        format: "bgra8unorm"
                    }
                ]
                },

                primitive: {
                    topology: "triangle-list"
                }
            }) as T;
        }
    }
}