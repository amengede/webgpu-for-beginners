import { Triangle } from "./triangle";
import { Camera } from "./camera";

export class Scene {

    triangles: Triangle[];
    player: Camera;

    constructor() {

        this.triangles = [];

        this.triangles.push(
            new Triangle(
                [2, 0, 0],
                0
            )
        );

        this.player = new Camera(
            [-2, 0, 0.5], 0, 0
        );

    }

    update() {

        this.triangles.forEach(
            (triangle) =>triangle.update()
        );

        this.player.update();
    }

    get_player(): Camera {
        return this.player;
    }

    get_triangles(): Triangle[] {
        return this.triangles;
    }
}