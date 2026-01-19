import { Triangle } from "./triangle";
import { Camera } from "./camera";
import { vec3,mat4 } from "gl-matrix";

export class Scene {

    triangles: Triangle[];
    player: Camera;
    object_data: Float32Array;
    triangle_count: number;

    constructor() {

        this.triangles = [];
        this.object_data = new Float32Array(16 * 1024);
        this.triangle_count = 0;

        var i: number = 0;
        for (var y:number = -5; y < 5; y++) {
            this.triangles.push(
                new Triangle(
                    [2, y, 0],
                    0
                )
            );

            var blank_matrix = mat4.create();
            for (var j: number = 0; j < 16; j++) {
                this.object_data[16 * i + j] = <number>blank_matrix[j];
            }
            i++;
            this.triangle_count++;
        }

        this.player = new Camera(
            [-2, 0, 0.5], 0, 0
        );

    }

    update() {

        var i: number = 0;

        this.triangles.forEach(
            (triangle) => {
                triangle.update();
                var model = triangle.get_model();
                for (var j: number = 0; j < 16; j++) {
                    this.object_data[16 * i + j] = <number>model[j];
                }
                i++;
            }
        );

        this.player.update();
    }

    get_player(): Camera {
        return this.player;
    }

    get_triangles(): Float32Array {
        return this.object_data;
    }

    spin_player(dX: number, dY: number) {
        this.player.eulers[2] -= dX;
        this.player.eulers[2] %= 360;

        this.player.eulers[1] = Math.min(
            89, Math.max(
                -89,
                this.player.eulers[1] + dY
            )
        );
    }

    move_player(forwards_amount: number, right_amount: number) {
        vec3.scaleAndAdd(
            this.player.position, this.player.position, 
            this.player.forwards, forwards_amount
        );

        vec3.scaleAndAdd(
            this.player.position, this.player.position, 
            this.player.right, right_amount
        );
    }
}