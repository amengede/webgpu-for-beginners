import { vec3, mat4 } from "gl-matrix";
import { deg2Rad } from "./math";

export class Statue {

    model: mat4

    position: vec3
    eulers: vec3

    constructor(position: vec3, eulers: vec3) {
        this.position = position;
        this.eulers = eulers;
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
        this.model = mat4.create();
        mat4.translate(this.model, this.model, this.position);
        mat4.rotateZ(this.model, this.model, deg2Rad(this.eulers[2]));
        mat4.rotateX(this.model, this.model, deg2Rad(this.eulers[0]));
    }
}