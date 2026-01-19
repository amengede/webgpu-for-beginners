import { vec3, vec2 } from "gl-matrix";
import { Triangle } from "./triangle";
import { Node } from "../acceleration_structures/node";
import { BVH } from "../acceleration_structures/bvh";

export class ObjMesh {

    v: vec3[]
    vt: vec2[]
    vn: vec3[]

    triangles: Triangle[]
    color: vec3
    scale: number

    minCorner: vec3
    maxCorner: vec3

    bvh: BVH;

    constructor() {

        this.v = [];
        this.vt = [];
        this.vn = [];

        this.triangles = [];

        this.minCorner = [ 1.0e30,  1.0e30,  1.0e30];
        this.maxCorner = [-1.0e30, -1.0e30, -1.0e30];
    }

    async initialize(color: vec3, url: string, scale: number) {

        //console.log("Iniatialize obj model: %s", url);

        this.color = color;
        this.scale = scale;
        await this.readFile(url);
        this.v = [];
        this.vt = [];
        this.vn = [];
        this.build_bvh();
    }

    async readFile(url: string) {

        var result: number[] = [];

        const response: Response = await fetch(url);
        const blob: Blob = await response.blob();
        const file_contents = (await blob.text())
        const lines = file_contents.split("\n");

        lines.forEach(
            (line) => {
                //console.log(line);
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
                    this.read_face_data(line, result);
                }
            }
        )
    }

    read_vertex_data(line: string) {

        const components = line.split(" ");
        // ["v", "x", "y", "z"]
        const new_vertex: vec3 = [
            this.scale * Number(components[1]).valueOf(),
            this.scale * Number(components[2]).valueOf(),
            this.scale * Number(components[3]).valueOf()
        ];

        this.v.push(new_vertex);

        vec3.min(this.minCorner, this.minCorner, new_vertex);
        vec3.max(this.maxCorner, this.maxCorner, new_vertex);
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

    read_face_data(line: string, result: number[]) {

        line = line.replace("\n", "");
        //console.log(line);
        const vertex_descriptions = line.split(" ");

        let indices: number[] = [];
        for (let i = 1; i < vertex_descriptions.length; i++) {
            indices.push(i);
        }

        let triangle_indices = this.triangulate(indices);
        //console.log(triangle_indices);
        // ["f", "v1", "v2", ...]
        /*
            triangle strip setup, eg.
            v1 v2 v3 v4 => (v1, v2, v3), (v3, v4, v1)

            no. of triangles = no. of vertices - 2
        */

       const triangle_count = triangle_indices.length / 3;
       //console.log("Triangle count: %d", triangle_count);
       for (var i = 0; i < triangle_count; i++) {
            var tri: Triangle = new Triangle();
            let triangle_index = triangle_indices[3 * i];
            //console.log(triangle_index);
            this.read_corner(vertex_descriptions[triangle_index], tri);
            triangle_index = triangle_indices[3 * i + 1];
            //console.log(triangle_index);
            this.read_corner(vertex_descriptions[triangle_index], tri);
            triangle_index = triangle_indices[3 * i + 2];
            //console.log(triangle_index);
            this.read_corner(vertex_descriptions[triangle_index], tri);
            tri.color = this.color;
            tri.make_centroid();
            this.triangles.push(tri);
       }
    }

    triangulate(indices: number[]): number[] {
        let triangle_indices: number[] = [];
        //console.log(indices);

        for (let i = 0; i < indices.length - 2; i++) {
            triangle_indices.push(indices[0]);
            triangle_indices.push(indices[i + 1]);
            triangle_indices.push(indices[i + 2]);
        }

        return triangle_indices;
    }

    read_corner(vertex_description: string, tri: Triangle) {
        const v_vt_vn = vertex_description.split("/");
        const v = this.v[Number(v_vt_vn[0]).valueOf() - 1];
        const vt = this.vt[Number(v_vt_vn[1]).valueOf() - 1];
        const vn = this.vn[Number(v_vt_vn[2]).valueOf() - 1];
        tri.corners.push(v);
        tri.normals.push(vn);
    }

    build_bvh() {

        //console.log("Build bvh");
        // Fetch nodes for all triangles.
        let input_nodes = new Array<Node>(this.triangles.length);
        for (let i = 0; i < this.triangles.length; i++) {
            input_nodes[i] = this.triangles[i].get_node();
        }

        this.bvh = new BVH(input_nodes);
    }

    get_node(): Node {
        /**
         * Get a node representing this mesh.
         */

        let node = new Node();

        // Grow the node
        vec3.min(node.minCorner, node.minCorner, this.minCorner);
        vec3.max(node.maxCorner, node.maxCorner, this.maxCorner);

        return node;
    }
}