export class RenderPipelineBuilder {

    device: GPUDevice;
    bindGroupLayouts: GPUBindGroupLayout[];
    src_code: string;
    vertex_entry: string;
    fragment_entry: string;
    buffers: GPUVertexBufferLayout[];
    colorTargetStates: GPUColorTargetState[];
    depthStencilState: GPUDepthStencilState | undefined;
    alpha_blend: boolean;

    constructor(device: GPUDevice) {
        this.bindGroupLayouts = [];
        this.device = device;
        this.buffers = [];
        this.colorTargetStates = [];
        this.depthStencilState = undefined;
        this.alpha_blend = false;
        this.reset();
    }

    reset() {
        this.bindGroupLayouts = [];
        this.buffers = [];
    }

    async addBindGroupLayout(layout: GPUBindGroupLayout) {

        this.bindGroupLayouts.push(layout);

    }

    setBlendState(blend: boolean) {
        this.alpha_blend = blend;
    }

    setSourceCode(src_code: string, vertex_entry: string, fragment_entry: string) {
        this.src_code = src_code;
        this.vertex_entry = vertex_entry;
        this.fragment_entry = fragment_entry;
    }

    addVertexBufferDescription(vertexBufferLayout: GPUVertexBufferLayout) {
        this.buffers.push(vertexBufferLayout);
    }

    addRenderTarget(format: GPUTextureFormat) {

        var target: GPUColorTargetState = {
            format: format,
        };

        if (this.alpha_blend) {
            target.blend = {
                color: {
                    operation: "add",
                    srcFactor: "src-alpha",
                    dstFactor: "one-minus-src-alpha",
                },

                alpha: {
                    operation: "add",
                    srcFactor: "one",
                    dstFactor: "zero"
                }
            };
        }

        this.colorTargetStates.push(target);
    }

    setDepthStencilState(depthStencil: GPUDepthStencilState) {
        this.depthStencilState = depthStencil;
    }

    async build(label: string): Promise<GPURenderPipeline> {
        
        var layout = this.device.createPipelineLayout({
            bindGroupLayouts: this.bindGroupLayouts
        });
    
        const pipeline = await this.device.createRenderPipeline({
            label: label,
            vertex : {
                module : this.device.createShaderModule({
                    code : this.src_code
                }),
                entryPoint : this.vertex_entry,
                buffers: this.buffers
            },
    
            fragment : {
                module : this.device.createShaderModule({
                    code : this.src_code
                }),
                entryPoint : this.fragment_entry,
                targets : this.colorTargetStates
            },
    
            primitive : {
                topology : "triangle-list"
            },
    
            layout: layout,
            depthStencil: this.depthStencilState,
        });

        this.reset();

        return pipeline;
    }
}