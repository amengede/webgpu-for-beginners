import { vec3 } from "gl-matrix"
import { deg2Rad } from "./math"

export class Camera {

    position: Float32Array
    theta: number
    phi: number
    forwards: Float32Array
    right: Float32Array
    up: Float32Array

    constructor(position: number[]) {
        this.position = new Float32Array(position);
        this.theta = 0.0;
        this.phi = 0.0;

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
    }
}