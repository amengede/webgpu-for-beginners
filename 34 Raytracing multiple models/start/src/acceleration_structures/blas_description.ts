import { mat4, vec3 } from "gl-matrix";
import { Node } from "./node";

export class BlasDescription {
    minCorner: vec3
    maxCorner: vec3
    center: vec3
    inverseModel: mat4 = mat4.create()
    data: Float32Array;

    constructor(node: Node, model: mat4, root_node: number) {

        this.minCorner = [ 1.0e30,  1.0e30,  1.0e30];
        this.maxCorner = [-1.0e30, -1.0e30, -1.0e30];
        var corner: vec3 = vec3.create();

        const corners: vec3[] = [
            [node.minCorner[0], node.minCorner[1], node.minCorner[2]],
            [node.minCorner[0], node.minCorner[1], node.maxCorner[2]],
            [node.minCorner[0], node.maxCorner[1], node.minCorner[2]],
            [node.minCorner[0], node.maxCorner[1], node.maxCorner[2]],
            [node.maxCorner[0], node.minCorner[1], node.minCorner[2]],
            [node.maxCorner[0], node.minCorner[1], node.maxCorner[2]],
            [node.maxCorner[0], node.maxCorner[1], node.minCorner[2]],
            [node.maxCorner[0], node.maxCorner[1], node.maxCorner[2]]];
        
        for (let i = 0; i < 8; i++) {
            vec3.transformMat4(corner, corners[i], model);
            vec3.min(this.minCorner, this.minCorner, corner);
            vec3.max(this.maxCorner, this.maxCorner, corner);
        }

        this.center = [
            (this.minCorner[0] + this.maxCorner[0]) / 2,
            (this.minCorner[1] + this.maxCorner[1]) / 2,
            (this.minCorner[2] + this.maxCorner[2]) / 2
        ];

        //mat4.invert(this.inverseModel, model);
        this.inverseModel = this.fast_inverse(model);

        this.data = new Float32Array(20);

        for (let j = 0; j < 16; j++) {
            this.data[j] = <number>this.inverseModel.at(j);
        }
        this.data[16] = root_node;
        this.data[17] = root_node;
        this.data[18] = root_node;
        this.data[19] = root_node;
    }

    fast_inverse(m: mat4): mat4 {
        /**
         * Transformations which do not change an object's size are called "affine",
         * such transformations have a very simple inverse.
         */
        let inverse: mat4 = mat4.create();

        let columns: vec3[] = [];
        for (let j = 0; j < 4; ++j) {
            columns.push([m[4 * j], m[4 * j + 1], m[4 * j + 2]]);
        }

        // Paste transpose of rotation (upper 3x3) into inverse
        for (let i = 0; i < 3; ++i) {
            for (let j = 0; j < 3; ++j) {
                inverse[i + 4 * j] = columns[i][j];
            }
        }
        
        // Add inverse of translation
        for (let i = 0; i < 3; ++i) {
            inverse[i + 12] = -vec3.dot(columns[i], columns[3]);
        }

        return inverse;
    }

    get_node(): Node {
        let node = new Node()
        node.minCorner = this.minCorner;
        node.maxCorner = this.maxCorner;
        return node;
    }
}