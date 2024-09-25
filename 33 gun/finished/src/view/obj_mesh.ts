import { vec3, vec2, mat4, vec4 } from "gl-matrix";

export class ObjMesh {

    buffer: GPUBuffer
    bufferLayout: GPUVertexBufferLayout
    v: vec3[]
    vt: vec2[]
    vn: vec3[]
    vertices: Float32Array
    vertexCount: number

    constructor() {

        this.v = [];
        this.vt = [];
        this.vn = [];
    }

    async initialize(device: GPUDevice, url: string, 
        v_enabled: boolean, vt_enabled: boolean, 
        vn_enabled: boolean, preTransform: mat4) {

        // x y z u v nx ny nz
        await this.readFile(url, v_enabled, vt_enabled, 
            vn_enabled, preTransform);

        var attributes: GPUVertexAttribute[] = [];
        var floatsPerVertex = 0;
        var attributesPerVertex = 0;

        if (v_enabled) {
            attributes.push({
                shaderLocation: attributesPerVertex,
                format: "float32x3",
                offset: floatsPerVertex * 4
            });
            attributesPerVertex += 1;
            floatsPerVertex += 3;
        }

        if (vt_enabled) {
            attributes.push({
                shaderLocation: attributesPerVertex,
                format: "float32x2",
                offset: floatsPerVertex * 4
            });
            attributesPerVertex += 1;
            floatsPerVertex += 2;
        }

        if (vn_enabled) {
            attributes.push({
                shaderLocation: attributesPerVertex,
                format: "float32x3",
                offset: floatsPerVertex * 4
            });
            attributesPerVertex += 1;
            floatsPerVertex += 3;
        }

        this.vertexCount = this.vertices.length / floatsPerVertex;
        /*
        console.log("Vertex Count: %d", this.vertices.length);
        console.log("Attribute Count: %d\nFloat Count: %d\nvertexCount: %d", 
            attributesPerVertex, floatsPerVertex, this.vertexCount);
        console.log("Actual byte size: %d\nExpected byte size: %d",
            this.vertices.byteLength, 4 * floatsPerVertex * this.vertexCount);
        */

        const usage: GPUBufferUsageFlags = GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST;
        //VERTEX: the buffer can be used as a vertex buffer
        //COPY_DST: data can be copied to the buffer

        const descriptor: GPUBufferDescriptor = {
            size: this.vertices.byteLength,
            usage: usage,
            mappedAtCreation: true // similar to HOST_VISIBLE, allows buffer to be written by the CPU
        };

        this.buffer = device.createBuffer(descriptor);

        //Buffer has been created, now load in the vertices
        new Float32Array(this.buffer.getMappedRange()).set(this.vertices);
        this.buffer.unmap();

        //now define the buffer layout
        this.bufferLayout = {
            arrayStride: floatsPerVertex * 4,
            attributes: attributes
        }

    }

    async readFile(url: string, 
        v_enabled: boolean, vt_enabled: boolean, 
        vn_enabled: boolean, preTransform: mat4) {

        var result: number[] = [];

        const response: Response = await fetch(url);
        const blob: Blob = await response.blob();
        const file_contents = (await blob.text())
        const lines = file_contents.split("\n");

        lines.forEach(
            (line) => {
                //console.log(line);
                if (line[0] == "v" && line[1] == " ") {
                    this.read_vertex_data(line, preTransform);
                }
                else if (line[0] == "v" && line[1] == "t") {
                    this.read_texcoord_data(line);
                }
                else if (line[0] == "v" && line[1] == "n") {
                    this.read_normal_data(line, preTransform);
                }
                else if (line[0] == "f") {
                    this.read_face_data(line, result, v_enabled, vt_enabled, vn_enabled);
                }
            }
        )

        this.vertices = new Float32Array(result);
    }

    read_vertex_data(line: string, preTransform: mat4) {

        const components = line.split(" ");
        // ["v", "x", "y", "z"]
        const new_vertex: vec4 = [
            Number(components[1]).valueOf(),
            Number(components[2]).valueOf(),
            Number(components[3]).valueOf(),
            1.0
        ];

        var v: vec4 = vec4.create();
        v = vec4.transformMat4(v, new_vertex, preTransform);

        this.v.push(vec3.fromValues(v[0], v[1], v[2]));
    }

    read_texcoord_data(line: string) {

        const components = line.split(" ");
        // ["vt", "u", "v"]
        const new_texcoord: vec2 = [
            Number(components[1]).valueOf(),
            Number(components[2]).valueOf()
        ];

        this.vt.push(new_texcoord);
    }

    read_normal_data(line: string, preTransform: mat4) {

        const components = line.split(" ");
        // ["vn", "nx", "ny", "nz"]
        const new_normal: vec4 = [
            Number(components[1]).valueOf(),
            Number(components[2]).valueOf(),
            Number(components[3]).valueOf(),
            0.0
        ];

        var v: vec4 = vec4.create();
        v = vec4.transformMat4(v, new_normal, preTransform);

        this.vn.push(vec3.fromValues(v[0], v[1], v[2]));
    }

    read_face_data(line: string, result: number[], 
        v_enabled: boolean, vt_enabled: boolean, vn_enabled: boolean) {

        line = line.replace("\n", "");
        const vertex_descriptions = line.split(" ");
        // ["f", "v1", "v2", ...]
        /*
            triangle fan setup, eg.
            v1 v2 v3 v4 => (v1, v2, v3), (v1, v3, v4)

            no. of triangles = no. of vertices - 2
        */

       const triangle_count = vertex_descriptions.length - 3; // accounting also for "f"
       for (var i = 0; i < triangle_count; i++) {
            //corner a
            this.read_corner(vertex_descriptions[1], result, v_enabled, vt_enabled, vn_enabled);
            this.read_corner(vertex_descriptions[2 + i], result, v_enabled, vt_enabled, vn_enabled);
            this.read_corner(vertex_descriptions[3 + i], result, v_enabled, vt_enabled, vn_enabled);
       }
    }

    read_corner(vertex_description: string, result: number[], 
        v_enabled: boolean, vt_enabled: boolean, vn_enabled: boolean) {
        const v_vt_vn = vertex_description.split("/");
        const v = this.v[Number(v_vt_vn[0]).valueOf() - 1];
        const vt = this.vt[Number(v_vt_vn[1]).valueOf() - 1];
        const vn = this.vt[Number(v_vt_vn[2]).valueOf() - 1];
        
        if (v_enabled) {
            result.push(v[0]);
            result.push(v[1]);
            result.push(v[2]);
        }

        if (vt_enabled) {
            result.push(vt[0]);
            result.push(vt[1]);
        }

        if (vn_enabled) {
            result.push(vn[0]);
            result.push(vn[1]);
            result.push(vn[2]);
        }
    }
}