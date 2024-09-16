import { vec3 } from "gl-matrix"
import { deg2Rad } from "./math"

export class Camera {

    position: Float32Array
    theta: number
    phi: number
    forwards: Float32Array
    right: Float32Array
    up: Float32Array
    data: Float32Array

    constructor(position: number[], maxBounces: number) {
        this.position = new Float32Array(position);
        this.theta = 0.0;
        this.phi = 0.0;

        this.data = new Float32Array(16);

        this.data[11] = maxBounces;

        this.recalculate_vectors();
    }

    recalculate_vectors() {
        
        this.forwards = new Float32Array(
            [
                Math.cos(deg2Rad(this.theta)) * Math.cos(deg2Rad(this.phi)),
                Math.sin(deg2Rad(this.theta)) * Math.cos(deg2Rad(this.phi)),
                Math.sin(deg2Rad(this.theta))
            ]
        );
        
        this.right = new Float32Array([0.0, 0.0, 0.0]);
        vec3.cross(this.right, this.forwards, [0.0, 0.0, 1.0]);
        this.up = new Float32Array([0.0, 0.0, 0.0]);
        vec3.cross(this.up, this.right, this.forwards);

        this.data[0] = this.position[0];
        this.data[1] = this.position[1];
        this.data[2] = this.position[2];

        this.data[4] = this.forwards[0];
        this.data[5] = this.forwards[1];
        this.data[6] = this.forwards[2];

        this.data[8] = this.right[0];
        this.data[9] = this.right[1];
        this.data[10] = this.right[2];

        this.data[12] = this.up[0];
        this.data[13] = this.up[1];
        this.data[14] = this.up[2];
    }
}