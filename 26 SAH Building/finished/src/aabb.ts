import { vec3 } from "gl-matrix"

export class aabb {
    bmin: vec3 = [1e30, 1e30, 1e30]; 
    bmax: vec3 = [-1e30, -1e30, -1e30]; 

    grow(p: vec3) { 
        vec3.min(this.bmin, this.bmin, p);
        vec3.max(this.bmax, this.bmax, p); 
    }

    area() { 
        var e:vec3 = vec3.create();
        vec3.subtract(e, this.bmax, this.bmin);
        return e[0] * e[1] + e[1] * e[2] + e[0] * e[2]; 
    }
}