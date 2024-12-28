import { vec3, mat4 } from "gl-matrix";
import { deg2Rad } from "./math";
import { FINE_PARTITION_TYPE } from "./constants";

export class GameObject {

    model: mat4

    position: vec3
    eulers: vec3
    angular_velocity: vec3

    object_type: FINE_PARTITION_TYPE;

    constructor(position: vec3, eulers: vec3, 
        angular_velocity: vec3,
        object_type: FINE_PARTITION_TYPE) {
        this.position = position;
        this.eulers = eulers;
        this.angular_velocity = angular_velocity;
        this.object_type = object_type;
        this.calculate_transform();
    }

    update(rate: number) {
        let scaled_velocity: vec3 = [0, 0, 0];
        vec3.scale(scaled_velocity, this.angular_velocity, rate * 0.1);
        vec3.add(this.eulers, this.eulers, scaled_velocity);
        
        for (let i = 0; i < 3; i++) {
            if (this.eulers[i] > 360.0) {
                this.eulers[i] -= 360.0;
            }
            else if (this.eulers[i] < 0) {
                this.eulers[i] += 360.0;
            }
        }
        this.calculate_transform();
    }

    calculate_transform() {
        this.model = mat4.create();
        mat4.translate(this.model, this.model, this.position);
        mat4.rotateZ(this.model, this.model, deg2Rad(this.eulers[2]));
        mat4.rotateX(this.model, this.model, deg2Rad(this.eulers[1]));
        mat4.rotateX(this.model, this.model, deg2Rad(this.eulers[0]));
    }
}