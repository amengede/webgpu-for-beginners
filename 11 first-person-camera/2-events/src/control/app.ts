import { Renderer } from "../view/renderer";
import { Scene } from "../model/scene";
import $ from "jquery";

export class App {

    canvas: HTMLCanvasElement;
    renderer: Renderer;
    scene: Scene;

    //Labels for displaying state
    keyLabel: HTMLElement;
    mouseXLabel: HTMLElement;
    mouseYLabel: HTMLElement;
    
    constructor(canvas: HTMLCanvasElement) {
        this.canvas = canvas;

        this.renderer = new Renderer(canvas);
        this.renderer.Initialize();

        this.scene = new Scene();

        this.keyLabel = <HTMLElement>document.getElementById("key-label");
        this.mouseXLabel = <HTMLElement>document.getElementById("mouse-x-label");
        this.mouseYLabel = <HTMLElement>document.getElementById("mouse-y-label");
        $(document).on("keypress", (event) => {this.handle_keypress(event)});
        $(document).on("mousemove", (event) => {this.handle_mouse_move(event)});
    }

    run = () => {

        var running: boolean = true;

        this.scene.update();

        this.renderer.render(
            this.scene.get_player(),
            this.scene.get_triangles()
        );

        if (running) {
            requestAnimationFrame(this.run);
        }
    }

    handle_keypress(event: JQuery.KeyPressEvent) {
        this.keyLabel.innerText = event.code;
    }

    handle_mouse_move(event: JQuery.MouseMoveEvent) {
        this.mouseXLabel.innerText = event.screenX.toString();
        this.mouseYLabel.innerText = event.screenY.toString();
    }

}