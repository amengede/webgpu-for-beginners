import { vec3, vec2 } from "gl-matrix";
import { Triangle } from "./triangle";
import { Node } from "./node";
import { aabb } from "./aabb";

export class Bin {
    bounds: aabb;
    primitiveCount: number = 0; 
};

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

        this.minCorner = [ 999999,  999999,  999999];
        this.maxCorner = [-999999, -999999, -999999];
    }

    async initialize(color: vec3, url: string) {

        this.color = color;
        await this.readFile(url);
        this.v = [];
        this.vt = [];
        this.vn = [];
        this.buildBVH();
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

    buildBVH() {

        this.triangleIndices = new Array(this.triangles.length)
        for (var i:number = 0; i < this.triangles.length; i += 1) {
            this.triangleIndices[i] = i;
        }

        this.nodes = new Array(2 * this.triangles.length - 1);
        for (var i:number = 0; i < 2 * this.triangles.length - 1; i += 1) {
            this.nodes[i] = new Node();
        }

        var root: Node = this.nodes[0];
        root.leftChild = 0;
        root.primitiveCount = this.triangles.length;
        this.nodesUsed = 1

        this.updateBounds(0);
        this.subdivide(0);
    }

    updateBounds(nodeIndex: number) {

        var node: Node = this.nodes[nodeIndex];
        node.minCorner = [999999, 999999, 999999];
        node.maxCorner = [-999999, -999999, -999999];

        for (var i: number = 0; i < node.primitiveCount; i += 1) {
            const triangle: Triangle = this.triangles[this.triangleIndices[node.leftChild + i]];

            triangle.corners.forEach(
                (corner: vec3) => {

                    vec3.min(node.minCorner, node.minCorner, corner);
                    vec3.max(node.maxCorner, node.maxCorner, corner);
                }
            )
        }
    }

    EvaluateSAH(nodeIndex: number, axis: number, candidatePos: number): number {
        var leftBox: aabb = new aabb();
        var rightBox: aabb = new aabb();
        var leftCount = 0, rightCount = 0;
        const node = this.nodes[nodeIndex];
        
        for (let i = 0; i < node.primitiveCount; i += 1) {
            var triangle = this.triangles[this.triangleIndices[node.leftChild + i]];

            if (triangle.centroid[axis] < candidatePos) {
                leftCount += 1;
                leftBox.grow(triangle.corners[0]);
                leftBox.grow(triangle.corners[1]);
                leftBox.grow(triangle.corners[2]);
            }
            else {
                rightCount += 1;
                rightBox.grow(triangle.corners[0]);
                rightBox.grow(triangle.corners[1]);
                rightBox.grow(triangle.corners[2]);
            }
        }
        const cost = leftCount * leftBox.area() + rightCount * rightBox.area();
        if (cost > 0) {
            return cost;
        }
        else {
            return 9999999999;
        }
    }

    subdivide(nodeIndex: number) {

        var node: Node = this.nodes[nodeIndex];

        if (node.primitiveCount < 2) {
            return;
        }

        var extent: vec3 = [0, 0, 0];
        vec3.subtract(extent, node.maxCorner, node.minCorner);
        // determine split axis using SAH
        var bestAxis = -1;
        var bestPos = 0, bestCost = 9999999999;
        for (let axis = 0; axis < 3; axis += 1 ) { 
            var boundsMin = node.minCorner[axis];
            var boundsMax = node.maxCorner[axis];
            if (boundsMin == boundsMax) {
                continue;
            }
            var bins: Bin[] = new Array<Bin>(16);
            var scale = 16 / (boundsMax - boundsMin);
            for (let i = 0; i < node.primitiveCount; i += 1) {
                var triangle = this.triangles[this.triangleIndices[i + node.leftChild]];
                const binIdx = Math.min(15, Math.floor((triangle.centroid[axis] - boundsMin) * scale)); 
                bins[binIdx].primitiveCount += 1;
                bins[binIdx].bounds.grow(triangle.corners[0]);
                bins[binIdx].bounds.grow(triangle.corners[1]);
                bins[binIdx].bounds.grow(triangle.corners[2]);
            }
    
                const candidatePos = boundsMin + i * scale;
                const cost = this.EvaluateSAH(nodeIndex, axis, candidatePos);
                
                if (cost < bestCost) {
                    bestPos = candidatePos;
                    bestAxis = axis;
                    bestCost = cost;
                }
            }
        }


        var e: vec3 = vec3.create();
        vec3.subtract(e, node.maxCorner, node.minCorner);
        const parentArea = e[0] * e[1] + e[1] * e[2] + e[0] * e[2];
        const parentCost = node.primitiveCount * parentArea;
        if (parentCost < bestCost) {
            return;
        }
        
        var axis = bestAxis;
        var splitPosition = bestPos;

        var i: number = node.leftChild;
        var j: number = i + node.primitiveCount - 1;

        while (i <= j) {
            if (this.triangles[this.triangleIndices[i]].centroid[axis] < splitPosition) {
                i += 1;
            }
            else {
                var temp: number = this.triangleIndices[i];
                this.triangleIndices[i] = this.triangleIndices[j];
                this.triangleIndices[j] = temp;
                j -= 1;
            }
        }

        var leftCount: number = i - node.leftChild;
        if (leftCount == 0 || leftCount == node.primitiveCount) {
            return;
        }

        const leftChildIndex: number = this.nodesUsed;
        this.nodesUsed += 1;
        const rightChildIndex: number = this.nodesUsed;
        this.nodesUsed += 1;

        this.nodes[leftChildIndex].leftChild = node.leftChild;
        this.nodes[leftChildIndex].primitiveCount = leftCount;

        this.nodes[rightChildIndex].leftChild = i;
        this.nodes[rightChildIndex].primitiveCount = node.primitiveCount - leftCount;

        node.leftChild = leftChildIndex;
        node.primitiveCount = 0;

        this.updateBounds(leftChildIndex);
        this.updateBounds(rightChildIndex);
        this.subdivide(leftChildIndex);
        this.subdivide(rightChildIndex);
    }
}