export class RenderPipelineBuilder {

    device: GPUDevice;
    bindGroupLayouts: GPUBindGroupLayout[];
    src_code: string;
    vertex_entry: string;
    fragment_entry: string;
    buffers: GPUVertexBufferLayout[];
    renderTargets: GPUColorTargetState[];
    depthStencilState: GPUDepthStencilState | undefined;

    constructor(device: GPUDevice) {
        this.bindGroupLayouts = [];
        this.device = device;
        this.buffers = [];
        this.depthStencilState = undefined;
        this.reset();
    }

    reset() {
        this.bindGroupLayouts = [];
        this.buffers = [];
        this.renderTargets = [];
    }

    async addBindGroupLayout(layout: GPUBindGroupLayout) {

        this.bindGroupLayouts.push(layout);

    }

    setSourceCode(src_code: string, vertex_entry: string, fragment_entry: string) {
        this.src_code = src_code;
        this.vertex_entry = vertex_entry;
        this.fragment_entry = fragment_entry;
    }

    addVertexBufferDescription(vertexBufferLayout: GPUVertexBufferLayout) {
        this.buffers.push(vertexBufferLayout);
    }

    addRenderTarget(format: GPUTextureFormat, blend: boolean) {
        var target: GPUColorTargetState = {
            format: format,
        };

        if (blend) {
            target.blend = {
                color: {
                    operation: "add",
                    srcFactor: "src-alpha",
                    dstFactor: "one-minus-src-alpha"
                },
                alpha: {
                    operation: "add",
                    srcFactor: "one",
                    dstFactor: "zero"
                },
            };
        }
        this.renderTargets.push(target);
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
                targets : this.renderTargets
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