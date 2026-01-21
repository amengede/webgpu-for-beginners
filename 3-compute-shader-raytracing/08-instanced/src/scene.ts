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
    debugMode: boolean = false

    constructor() {

        //Make objMesh
        this.statue_mesh = new ObjMesh();
        
        this.statues = new Array(9);
        var i: number = 0;
        for (let y = -1; y < 2; y++) {
            for (let x = -1; x < 2; x++) {
                this.statues[i] = new Statue([2 * x, 2 * y, 0], [180, 0, 90]);
                i += 1;
            }
        }
        
        this.camera = new Camera([-6.0, 0.0, -1.0]);
    }

    async make_scene() {

        await this.statue_mesh.initialize([1.0, 1.0, 1.0], "dist/models/statue.obj");
        //await this.statue_mesh.initialize([1.0, 1.0, 1.0], "dist/models/ground.obj");

        if (this.debugMode) {
        console.log("Bottom Level Acceleration Structure:");
            for (let i = 0; i < this.statue_mesh.nodesUsed; i++) {
                let node: Node = this.statue_mesh.nodes[i];
                if (node.primitiveCount == 0) {
                    console.log("Internal Node:");
                    console.log("\tIndex: %d", i);
                    console.log("\tleft child: %d, right child: %d", node.leftChild, node.leftChild + 1);
                }
                else {
                    console.log("External Node:");
                    console.log("\tIndex: %d", i);
                    console.log("\tfirst primitive index: %d, primitive count: %d", node.leftChild, node.primitiveCount);
                }
                console.log("\t Extent: (%f, %f, %f) -> (%f, %f, %f)",
                    node.minCorner[0], node.minCorner[1], node.minCorner[2],
                    node.maxCorner[0], node.maxCorner[1], node.maxCorner[2],
                )
            }
        }

        this.triangles = [];
        //console.log("Triangles:")
        this.statue_mesh.triangles.forEach(
            (tri) => {
                this.triangles.push(tri);
                //console.log(tri.centroid);
            }
        )

        this.triangleIndices = [];
        //console.log("Triangle Indices:")
        this.statue_mesh.triangleIndices.forEach(
            (index) => {
                this.triangleIndices.push(index);
                //console.log(index)
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

        this.statues.forEach(
            (statue) => {
                statue.update(frametime / 16.667);
            }
        )

        this.buildBVH();
    }

    buildBVH() {
        const blasNodesUsed: number = this.statue_mesh.nodesUsed;
        if (this.debugMode) {
            console.log("TLAS needs %d nodes, BLAS needs %d nodes, total: %d nodes",
                this.tlasNodesMax, blasNodesUsed, this.tlasNodesMax + blasNodesUsed
            );
        }

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

        if (this.debugMode) {
            console.log("BLAS descriptions:");
            for (let i = 0; i < this.blasDescriptions.length; i++) {
                let description: blasDescription = this.blasDescriptions[i];
                console.log("Index: %d", i)
                console.log("\t Extent: (%f, %f, %f) -> (%f, %f, %f)",
                    description.minCorner[0], description.minCorner[1], description.minCorner[2],
                    description.maxCorner[0], description.maxCorner[1], description.maxCorner[2],
                )
                console.log("\t Root node index: %d", description.rootNodeIndex);
            }
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

        if (this.debugMode) {
            console.log("BLAS mappings:");
            for (let i = 0; i < this.blasIndices.length; i++) {
                console.log("Index: %d maps to %d", i, this.blasIndices[i]);
            }

            console.log("Top Level Acceleration Structure:");
            for (let i = 0; i < this.nodesUsed; i++) {
                let node: Node = this.nodes[i]
                if (node.primitiveCount == 0) {
                    console.log("Internal Node:");
                    console.log("\tIndex: %d", i);
                    console.log("\tleft child: %d, right child: %d", node.leftChild, node.leftChild + 1);
                }
                else {
                    console.log("External Node:");
                    console.log("\tIndex: %d", i);
                    console.log("\tfirst blas index: %d, blas count: %d", node.leftChild, node.primitiveCount);
                }
                console.log("\t Extent: (%f, %f, %f) -> (%f, %f, %f)",
                    node.minCorner[0], node.minCorner[1], node.minCorner[2],
                    node.maxCorner[0], node.maxCorner[1], node.maxCorner[2],
                )
            }
        }

        for (var i: number = 0; i < this.statue_mesh.nodesUsed; i++) {
            var nodeToUpload = this.statue_mesh.nodes[i];
            if (nodeToUpload.primitiveCount == 0) {
                //Internal node: leftChild must be shifted
                nodeToUpload.leftChild += this.tlasNodesMax;
            }

            //store node
            this.nodes[this.tlasNodesMax + i] = nodeToUpload;
        }

        if (this.debugMode) {
            console.log("Final Nodes:");
            for (let i = 0; i < this.nodes.length; i++) {
                let node: Node = this.nodes[i]
                if (node.primitiveCount == 0) {
                    console.log("Internal Node:");
                    console.log("\tIndex: %d", i);
                    console.log("\tleft child: %d, right child: %d", node.leftChild, node.leftChild + 1);
                }
                else {
                    console.log("External Node:");
                    console.log("\tIndex: %d", i);
                    console.log("\tfirst primitive index: %d, primitive count: %d", node.leftChild, node.primitiveCount);
                }
                console.log("\t Extent: (%f, %f, %f) -> (%f, %f, %f)",
                    node.minCorner[0], node.minCorner[1], node.minCorner[2],
                    node.maxCorner[0], node.maxCorner[1], node.maxCorner[2],
                )
            }
        }
    }
}