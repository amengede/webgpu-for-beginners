import { vec3 } from "gl-matrix"

export class Node {
    minCorner: vec3
    leftChild: number
    maxCorner: vec3
    primitiveCount: number
    data: Float32Array

    constructor() {
        this.minCorner = [ 1.0e30,  1.0e30,  1.0e30];
        this.maxCorner = [-1.0e30, -1.0e30, -1.0e30];
        this.data = new Float32Array(8);
    }

    flatten() {
        
        this.data[0] = this.minCorner[0];
        this.data[1] = this.minCorner[1];
        this.data[2] = this.minCorner[2];
        this.data[3] = this.leftChild;
        this.data[4] = this.maxCorner[0];
        this.data[5] = this.maxCorner[1];
        this.data[6] = this.maxCorner[2];
        this.data[7] = this.primitiveCount;
    }
}