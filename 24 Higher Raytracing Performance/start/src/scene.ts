import { Triangle } from "./triangle";
import { Camera } from "./camera";
import { Node } from "./node";
import { vec3 } from "gl-matrix";
import {ObjMesh} from "./obj_mesh";
import { Statue } from "./statue";
import { blasDescription } from "./blas_description";

export class Scene {

    camera: Camera
    triangles: Triangle[]
    triangleIndices: number[]
    nodes: Node[]
    nodesUsed: number = 0
    tlasNodesMax: number
    blasIndices: number[]
    blasDescriptions: blasDescription[]
    statue_mesh: ObjMesh
    statues: Statue[]
    blas_consumed: boolean = false

    constructor() {

        //Make objMesh
        this.statue_mesh = new ObjMesh();
        
        this.statues = new Array(1000);
        var i: number = 0;
        for (let x = -5; x < 5; x++) {
            for (let y = -5; y < 5; y++) {
                for (let z = -5; z < 5; z++) {
                    this.statues[i] = new Statue([4 * x, 4 * y, 4 * z], [180, 0, 90]);
                    i += 1;
                }
            }
        }
        
        this.camera = new Camera([-2.0, 0.0, -2.0]);
    }

    async make_scene() {

        await this.statue_mesh.initialize(
            [1.0, 1.0, 1.0], 
            "dist/models/statue.obj",
            "dist/models/statue.blas",
        );

        this.triangles = [];
        this.statue_mesh.triangles.forEach(
            (tri) => {
                this.triangles.push(tri);
            }
        )

        this.triangleIndices = [];
        this.statue_mesh.triangleIndices.forEach(
            (index) => {
                this.triangleIndices.push(index);
            }
        )
        this.tlasNodesMax = 2 * this.statues.length - 1;
        const blasNodesUsed: number = this.statue_mesh.nodesUsed;
        this.nodes = new Array(this.tlasNodesMax + blasNodesUsed);
        for (var i:number = 0; i < this.tlasNodesMax + blasNodesUsed; i += 1) {
            this.nodes[i] = new Node();
            this.nodes[i].leftChild = 0;
            this.nodes[i].primitiveCount = 0;
            this.nodes[i].minCorner = [0,0,0];
            this.nodes[i].maxCorner = [0,0,0];
        }
        this.buildBVH();
        this.finalizeBVH();
        this.blas_consumed = true;
    }

    update(frametime: number) {

        const updateStart = performance.now();
        this.statues.forEach(
            (statue) => {
                statue.update(frametime / 16.667);
            }
        )
        const updateEnd = performance.now();
        const updateTimeLabel: HTMLElement = <HTMLElement> document.getElementById("update-time");
        updateTimeLabel.innerText = (updateEnd - updateStart).toFixed(2).toString();

        const tlasStart = performance.now();
        this.buildBVH();
        const tlasEnd = performance.now();
        const tlasTimeLabel: HTMLElement = <HTMLElement> document.getElementById("tlas-time");
        tlasTimeLabel.innerText = (tlasEnd - tlasStart).toFixed(2).toString();
    }

    buildBVH() {

        this.nodesUsed = 0;

        this.blasDescriptions = new Array(this.statues.length);
        this.blasIndices = new Array(this.statues.length);
        for (var i: number = 0; i < this.statues.length; i++) {
            var description: blasDescription = new blasDescription(
                this.statue_mesh.minCorner, 
                this.statue_mesh.maxCorner,
                this.statues[i].model
            );
            description.rootNodeIndex = this.tlasNodesMax;

            this.blasDescriptions[i] = description;
            this.blasIndices[i] = i;
        }

        for (var i:number = 0; i < this.tlasNodesMax; i += 1) {
            this.nodes[i].leftChild = 0;
            this.nodes[i].primitiveCount = 0;
            this.nodes[i].minCorner = [0,0,0];
            this.nodes[i].maxCorner = [0,0,0];
        }

        var root: Node = this.nodes[0];
        root.leftChild = 0;
        root.primitiveCount = this.blasDescriptions.length;
        this.nodesUsed += 1

        this.updateBounds(0);
        this.subdivide(0);
    }

    updateBounds(nodeIndex: number) {

        var node: Node = this.nodes[nodeIndex];
        node.minCorner = [999999, 999999, 999999];
        node.maxCorner = [-999999, -999999, -999999];

        for (var i: number = 0; i < node.primitiveCount; i += 1) {
            const description: blasDescription = this.blasDescriptions[this.blasIndices[node.leftChild + i]];
            vec3.min(node.minCorner, node.minCorner, description.minCorner);
            vec3.max(node.maxCorner, node.maxCorner, description.maxCorner);
        }
    }

    subdivide(nodeIndex: number) {

        var node: Node = this.nodes[nodeIndex];

        if (node.primitiveCount < 2) {
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
            if (this.blasDescriptions[this.blasIndices[i]].center[axis] < splitPosition) {
                i += 1;
            }
            else {
                var temp: number = this.blasIndices[i];
                this.blasIndices[i] = this.blasIndices[j];
                this.blasIndices[j] = temp;
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

    finalizeBVH() {

        for (var i: number = 0; i < this.statue_mesh.nodesUsed; i++) {
            var nodeToUpload = this.statue_mesh.nodes[i];
            if (nodeToUpload.primitiveCount == 0) {
                //Internal node: leftChild must be shifted
                nodeToUpload.leftChild += this.tlasNodesMax;
            }

            //store node
            this.nodes[this.tlasNodesMax + i] = nodeToUpload;
        }
    }
}