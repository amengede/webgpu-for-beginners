import { vec3, vec2, mat4 } from "gl-matrix";
import { Triangle } from "./triangle";
import { deg2Rad } from "./math";

export class ObjMesh {

    v: vec3[]
    vt: vec2[]
    vn: vec3[]
    inverseModel: mat4

    triangles: Triangle[]
    color: vec3
    position: vec3
    eulers: vec3

    constructor(position: vec3, eulers: vec3) {

        this.v = [];
        this.vt = [];
        this.vn = [];

        this.triangles = [];

        this.position = position;
        this.eulers = eulers;
        this.inverseModel = mat4.create();
        this.calculate_transform();
    }

    update(rate: number) {
        this.eulers[2] += rate * 0.5;
        if (this.eulers[2] > 360) {
            this.eulers[2] -= 360;
        }
        this.calculate_transform();
    }

    calculate_transform() {
        var model: mat4 = mat4.create();
        mat4.rotateZ(model, model, deg2Rad(this.eulers[2]));
        mat4.rotateX(model, model, deg2Rad(this.eulers[0]));
        mat4.translate(model, model, this.position);
        mat4.invert(this.inverseModel, model);
    }

    async initialize(color: vec3, url: string) {

        this.color = color;
        await this.readFile(url);

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

    read_face_data(line: string, result: number[]) {

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
}