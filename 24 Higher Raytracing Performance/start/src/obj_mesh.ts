import { vec3, vec2 } from "gl-matrix";
import { Triangle } from "./triangle";
import { Node } from "./node";

export class ObjMesh {

    v: vec3[]
    vt: vec2[]
    vn: vec3[]

    triangles: Triangle[]
    color: vec3

    triangleIndices: number[]
    nodes: Node[]
    nodesUsed: number

    minCorner: vec3
    maxCorner: vec3

    constructor() {

        this.v = [];
        this.vt = [];
        this.vn = [];

        this.triangles = [];

        this.nodes = [];

        this.triangleIndices = [];

        this.nodesUsed = 0;

        this.minCorner = [ 999999,  999999,  999999];
        this.maxCorner = [-999999, -999999, -999999];
    }

    async initialize(color: vec3, obj_url: string, blas_url: string) {

        this.color = color;
        await this.readFile(obj_url);
        this.v = [];
        this.vt = [];
        this.vn = [];
        await this.readBVH(blas_url);
        console.log("Nodes stored: %d", this.nodes.length)
    }

    async readFile(url: string) {

        const response: Response = await fetch(url);
        const blob: Blob = await response.blob();
        const file_contents = (await blob.text())
        const lines = file_contents.split("\n");

        lines.forEach(
            (line) => {
                if (line[0] == "v" && line[1] == " ") {
                    this.read_vertex_data(line);
                }
                else if (line[0] == "v" && line[1] == "t") {
                    this.read_texcoord_data(line);
                }
                else if (line[0] == "v" && line[1] == "n") {
                    this.read_normal_data(line);
                }
                else if (line[0] == "f") {
                    this.read_face_data(line);
                }
            }
        )
    }

    read_vertex_data(line: string) {

        const components = line.split(" ");
        // ["v", "x", "y", "z"]
        const new_vertex: vec3 = [
            Number(components[1]).valueOf(),
            Number(components[2]).valueOf(),
            Number(components[3]).valueOf()
        ];

        this.v.push(new_vertex);
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

    read_normal_data(line: string) {

        const components = line.split(" ");
        // ["vn", "nx", "ny", "nz"]
        const new_normal: vec3 = [
            Number(components[1]).valueOf(),
            Number(components[2]).valueOf(),
            Number(components[3]).valueOf()
        ];

        this.vn.push(new_normal);
    }

    read_face_data(line: string) {

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
            var tri: Triangle = new Triangle();
            this.read_corner(vertex_descriptions[1], tri);
            this.read_corner(vertex_descriptions[2 + i], tri);
            this.read_corner(vertex_descriptions[3 + i], tri);
            tri.color = this.color;
            tri.make_centroid();
            this.triangles.push(tri);
       }
    }

    read_corner(vertex_description: string, tri: Triangle) {
        const v_vt_vn = vertex_description.split("/");
        const v = this.v[Number(v_vt_vn[0]).valueOf() - 1];
        const vt = this.vt[Number(v_vt_vn[1]).valueOf() - 1];
        const vn = this.vn[Number(v_vt_vn[2]).valueOf() - 1];
        tri.corners.push(v);
        tri.normals.push(vn);
    }

    async readBVH(url: string) {

        const response: Response = await fetch(url);
        const blob: Blob = await response.blob();
        const file_contents = (await blob.text())
        const lines = file_contents.split("\n");

        lines.forEach(
            (line) => {

                const words: string[] = line.split(" ");

                if (words[0] == "min") {
                    this.read_min_corner(words);
                }
                else if (words[0] == "max") {
                    this.read_max_corner(words);
                }
                else if (words[0] == "nodes") {
                    this.read_node_count(words);
                }
                else if (words[0] == "node") {
                    this.read_node_data(words);
                }
                else if (words[0] == "triIndex") {
                    this.read_index_data(words);
                }
            }
        )
    }

    read_min_corner(words: string[]) {

        this.minCorner = [
            Number(words[1]).valueOf(),
            Number(words[2]).valueOf(),
            Number(words[3]).valueOf()
        ]
    }

    read_max_corner(words: string[]) {

        this.maxCorner = [
            Number(words[1]).valueOf(),
            Number(words[2]).valueOf(),
            Number(words[3]).valueOf()
        ]
    }

    read_node_count(words: string[]) {

        this.nodesUsed = Number(words[1]).valueOf()
    }

    read_node_data(words: string[]) {

        let node: Node = new Node()

        //Min Corner
        node.minCorner = [
            Number(words[1]).valueOf(),
            Number(words[2]).valueOf(),
            Number(words[3]).valueOf(),
        ]

        //Max Corner
        node.maxCorner = [
            Number(words[4]).valueOf(),
            Number(words[5]).valueOf(),
            Number(words[6]).valueOf(),
        ]

        //Left Child
        node.leftChild = Number(words[7]).valueOf()

        //Primitive Count
        node.primitiveCount = Number(words[8]).valueOf()

        this.nodes.push(node)
    }

    read_index_data(words: string[]) {

        this.triangleIndices.push(Number(words[1]).valueOf())
    }
}