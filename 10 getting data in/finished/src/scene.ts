import { Sphere } from "./sphere";
import { Camera } from "./camera";

export class Scene {

    spheres: Sphere[]
    camera: Camera

    constructor() {

        this.spheres = new Array(32);
        for (let i = 0; i < this.spheres.length; i++) {

            const center: number[] = [
                3.0 + 7.0 * Math.random(),
                -5.0 + 10.0 * Math.random(),
                -5.0 + 10.0 * Math.random()
            ];

            const radius: number = 0.1 + 1.9 * Math.random();

            const color: number[] = [
                0.3 + 0.7 * Math.random(),
                0.3 + 0.7 * Math.random(),
                0.3 + 0.7 * Math.random()
            ];

            this.spheres[i] = new Sphere(center, radius,color);
        }

        this.camera = new Camera([-20.0, 0.0, 0.0]);
    }
}