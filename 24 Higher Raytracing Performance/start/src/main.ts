import { Scene } from "./scene";
import { Renderer } from "./renderer";

const canvas : HTMLCanvasElement = <HTMLCanvasElement> document.getElementById("gfx-main");

const scene: Scene = new Scene();

await scene.make_scene();

const sphereCountLabel: HTMLElement = <HTMLElement> document.getElementById("tri-count");
sphereCountLabel.innerText = (scene.statues.length * scene.triangles.length).toString();

const renderer = new Renderer(canvas, scene);

await renderer.Initialize();
