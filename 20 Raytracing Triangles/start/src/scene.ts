import { Triangle } from "./triangle";
import { Camera } from "./camera";
import { Node } from "./node";
import { vec3 } from "gl-matrix";

export class Scene {

    triangles: Triangle[]
    camera: Camera
    triangleCount: number
    nodes: Node[]
    nodesUsed: number = 0
    triangleIndices: number[]

    constructor(triangleCount: number) {

        this.triangleCount = triangleCount;
        this.triangles = new Array(triangleCount);
        for (let i = 0; i < this.triangles.length; i++) {

            const center: vec3 = [
                -50 + 100.0 * Math.random(),
                -50.0 + 100.0 * Math.random(),
                -50.0 + 100.0 * Math.random()
            ];

            const offsets: vec3[] = 
            [
                [
                    -3 + 6 * Math.random(),
                    -3 + 6 * Math.random(),
                    -3 + 6 * Math.random()
                ],
                [
                    -3 + 6 * Math.random(),
                    -3 + 6 * Math.random(),
                    -3 + 6 * Math.random()
                ],
                [
                    -3 + 6 * Math.random(),
                    -3 + 6 * Math.random(),
                    -3 + 6 * Math.random()
                ]
            ];

            const color: vec3 = [
                0.3 + 0.7 * Math.random(),
                0.3 + 0.7 * Math.random(),
                0.3 + 0.7 * Math.random()
            ];

            this.triangles[i] = new Triangle();
            this.triangles[i].build_from_center_and_offsets(center, offsets, color);
        }

        this.camera = new Camera([-20.0, 0.0, 0.0]);

        this.buildBVH();
    }

    buildBVH() {

        this.triangleIndices = new Array(this.triangles.length)
        for (var i:number = 0; i < this.triangleCount; i += 1) {
            this.triangleIndices[i] = i;
        }

        this.nodes = new Array(2 * this.triangles.length - 1);
        for (var i:number = 0; i < 2 * this.triangles.length - 1; i += 1) {
            this.nodes[i] = new Node();
        }

        var root: Node = this.nodes[0];
        root.leftChild = 0;
        root.primitiveCount = this.triangles.length;
        this.nodesUsed += 1

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

    subdivide(nodeIndex: number) {

        var node: Node = this.nodes[nodeIndex];

        if (node.primitiveCount <= 2) {
            return;
        }

        var extent: vec3 = [0, 0, 0];
        vec3.subtract(extent, node.maxCorner, node.minCorner);
        var axis: number = 0;
        if (extent[1] > extent[axis]) {
            axis = 1;
        }
        if (extent[2] > extent[axis]) {
            axis = 2;
        }

        const splitPosition: number = node.minCorner[axis] + extent[axis] / 2;

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