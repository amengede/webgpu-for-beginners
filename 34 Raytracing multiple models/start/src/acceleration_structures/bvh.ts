import { vec3 } from "gl-matrix";
import { Node } from "./node";

/**
 * An abstract bounding volume hierarchy.
 */
export class BVH {
    

    indices: number[]
    nodes: Node[]
    nodes_used: number

    constructor(input_nodes: Node[]) {
        /**
         * Build a new BVH from a collection of primitive nodes.
         */

        this.indices = new Array(input_nodes.length)
        for (var i: number = 0; i < input_nodes.length; i += 1) {
            this.indices[i] = i;
        }

        this.nodes = new Array(2 * input_nodes.length - 1);
        for (var i: number = 0; i < 2 * input_nodes.length - 1; i += 1) {
            this.nodes[i] = new Node();
        }

        var root: Node = this.nodes[0];
        root.leftChild = 0;
        root.primitiveCount = input_nodes.length;
        this.nodes_used = 1

        this.update_bounds(0, input_nodes);
        this.subdivide(0, input_nodes);
    }

    update_bounds(node_index: number, input_nodes: Node[]) {
        /**
         * update the node at the given index so that it ecompasses
         * all of its child nodes.
         */

        var node: Node = this.nodes[node_index];
        node.minCorner = [ 1.0e30,  1.0e30,  1.0e30];
        node.maxCorner = [-1.0e30, -1.0e30, -1.0e30];

        // For the current node's region of indices
        for (var i: number = 0; i < node.primitiveCount; i += 1) {

            // Get the corresponding child node from the input set
            const child_node: Node = input_nodes[this.indices[node.leftChild + i]];
            
            // Grow the current node
            vec3.min(node.minCorner, node.minCorner, child_node.minCorner);
            vec3.max(node.maxCorner, node.maxCorner, child_node.maxCorner);
        }
    }

    subdivide(node_index: number, input_nodes: Node[]) {
        /**
         * Split the given node.
         */

        var node: Node = this.nodes[node_index];

        // Early exit: can't split any further
        if (node.primitiveCount < 2) {
            return;
        }

        // Find largest axis and split position
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

        // Lower and Upper bounds for region of indices for current node
        var i: number = node.leftChild;
        var j: number = i + node.primitiveCount - 1;
        // inplace quicksort, i and j converge towards each other.
        // After sort:
        // [0,i) should hold all nodes less than split position,
        // and [i, j] should hold all nodes greater than split position.
        while (i <= j) {
            
            let primitive: Node = input_nodes[this.indices[i]];
            let pos: number = 0.5 * (primitive.minCorner[axis] + primitive.maxCorner[axis]);
            if (pos < splitPosition) {
                // node i is in the correct sub-region
                i += 1;
            }
            else {
                // swap node i & j
                var temp: number = this.indices[i];
                this.indices[i] = this.indices[j];
                this.indices[j] = temp;
                j -= 1;
            }
        }

        var leftCount: number = i - node.leftChild;
        // Early exit: no actual splitting occured, all nodes stayed in one box.
        if (leftCount == 0 || leftCount == node.primitiveCount) {
            return;
        }

        const leftChildIndex: number = this.nodes_used;
        this.nodes_used += 1;
        const rightChildIndex: number = this.nodes_used;
        this.nodes_used += 1;

        this.nodes[leftChildIndex].leftChild = node.leftChild;
        this.nodes[leftChildIndex].primitiveCount = leftCount;

        this.nodes[rightChildIndex].leftChild = i;
        this.nodes[rightChildIndex].primitiveCount = node.primitiveCount - leftCount;

        node.leftChild = leftChildIndex;
        node.primitiveCount = 0;

        this.update_bounds(leftChildIndex, input_nodes);
        this.update_bounds(rightChildIndex, input_nodes);
        this.subdivide(leftChildIndex, input_nodes);
        this.subdivide(rightChildIndex, input_nodes);
    }

    get_flattened_nodes(offsets: number[]): Float32Array {
        /**
         * Get all the nodes in a flat, GPU-friendly form.
         */

        let data = new Float32Array(this.nodes.length * 8);

        for (let i = 0; i < this.nodes.length; i++) {
            
            this.nodes[i].flatten();
            let external = this.nodes[i].data[7] > 0;
            if (external) {
                this.nodes[i].data[3] += offsets[1];
            }
            else {
                this.nodes[i].data[3] += offsets[0];
            }

            let write_position = 8 * i;
            for (let j = 0; j < 8; j++) {
                data[write_position + j] = this.nodes[i].data[j];
            }
        }

        return data;
    }

    get_flattened_indices(offsets: number[]): Float32Array {
        /**
         * Get all the indices in a flat, GPU-friendly form.
         */

        let data = new Float32Array(this.indices.length);

        for (let i = 0; i < this.indices.length; i++) {
            data[i] = this.indices[i] + offsets[0];
        }

        return data;
    }
}