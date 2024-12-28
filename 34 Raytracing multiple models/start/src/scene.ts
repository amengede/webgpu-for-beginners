import { Camera } from "./camera";
import { vec3 } from "gl-matrix";
import { GameObject } from "./game_object";
import { Random } from "random";

export class Scene {

    camera: Camera
    objects: GameObject[]
    debugMode: boolean = false

    constructor() {
        
        // Instantiate Statues
        this.objects = new Array();
        let object_count = 100;
        let random = new Random();
        for (let i = 0; i < object_count; i++) {

            let x = random.float(-10.0, 10.0);
            let y = random.float(-10.0, 10.0);
            let z = random.float(-10.0, 10.0);
            let position: vec3 = [x, y, z];

            x = random.float(0.0, 360.0);
            y = random.float(0.0, 360.0);
            z = random.float(0.0, 360.0);
            let eulers: vec3 = [x, y, z];

            x = random.float(-0.2, 0.2);
            y = random.float(-0.2, 0.2);
            z = random.float(-0.2, 0.2);
            let angular_velocity: vec3 = [x, y, z];
            
            this.objects.push(new GameObject(position, eulers, angular_velocity));
        }
        
        // Make camera
        this.camera = new Camera([-6.0, 0.0, -1.0], 4);
    }

    update(frametime: number) {

        this.objects.forEach(
            (object) => {
                object.update(frametime / 16.667);
            }
        )
    }
}