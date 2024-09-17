import { Triangle } from "./triangle";
import { Quad } from "./quad";
import { Camera } from "./camera";
import { vec3,mat4 } from "gl-matrix";
import { object_types, RenderData } from "./definitions";
import { Statue } from "./statue";

export class Scene {

    triangles: Triangle[];
    quads: Quad[];
    statue: Statue;
    player: Camera;
    object_data: Float32Array;
    triangle_count: number;
    quad_count: number;

    constructor() {

        this.triangles = [];
        this.quads = [];
        this.object_data = new Float32Array(16 * 1024);
        this.triangle_count = 0;
        this.quad_count = 0;

        this.make_triangles();
        this.make_quads();
        this.statue = new Statue(
            [0, 0, 0], [0, 0, 0]
        );

        this.player = new Camera(
            [-2, 0, 0.5], 0, 0
        );

    }

    make_triangles() {
        var i: number = 0;
        for (var y:number = -5; y <= 5; y++) {
            this.triangles.push(
                new Triangle(
                    [2, y, 0],
                    0
                )
            );

            var blank_matrix = mat4.create();
            for (var j: number = 0; j < 16; j++) {
                this.object_data[16 * i + j] = <number>blank_matrix.at(j);
            }
            i++;
            this.triangle_count++;
        }
    }

    make_quads() {
        var i: number = this.triangle_count;
        for (var x: number = -10; x <= 10; x++) {
            for (var y:number = -10; y <= 10; y++) {
                this.quads.push(
                    new Quad(
                        [x, y, 0]
                    )
                );

                var blank_matrix = mat4.create();
                for (var j: number = 0; j < 16; j++) {
                    this.object_data[16 * i + j] = <number>blank_matrix.at(j);
                }
                i++;
                this.quad_count++;
            }
        }
    }

    update() {

        var i: number = 0;

        this.triangles.forEach(
            (triangle) => {
                triangle.update();
                var model = triangle.get_model();
                for (var j: number = 0; j < 16; j++) {
                    this.object_data[16 * i + j] = <number>model.at(j);
                }
                i++;
            }
        );

        this.quads.forEach(
            (quad) => {
                quad.update();
                var model = quad.get_model();
                for (var j: number = 0; j < 16; j++) {
                    this.object_data[16 * i + j] = <number>model.at(j);
                }
                i++;
            }
        );

        this.statue.update();
        var model = this.statue.get_model();
        for (var j: number = 0; j < 16; j++) {
            this.object_data[16 * i + j] = <number>model.at(j);
        }
        i++;

        this.player.update();
    }

    get_player(): Camera {
        return this.player;
    }

    get_renderables(): RenderData {
        return {
            view_transform: this.player.get_view(),
            model_transforms: this.object_data,
            object_counts: {
                [object_types.TRIANGLE]: this.triangle_count,
                [object_types.QUAD]: this.quad_count,
            }
        }
    }

    spin_player(dX: number, dY: number) {
        this.player.eulers[2] -= dX;
        this.player.eulers[2] %= 360;

        this.player.eulers[1] = Math.min(
            89, Math.max(
                -89,
                this.player.eulers[1] - dY
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