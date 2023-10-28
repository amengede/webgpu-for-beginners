import { Scene } from "./scene";
import { Renderer } from "./renderer";

const canvas : HTMLCanvasElement = <HTMLCanvasElement> document.getElementById("gfx-main");

const sphereCount: number = 1024;
const sphereCountLabel: HTMLElement = <HTMLElement> document.getElementById("sphere-count");

const scene: Scene = new Scene(sphereCount);

await scene.make_scene();

sphereCountLabel.innerText = scene.triangleCount.toString();

const renderer = new Renderer(canvas, scene);

await renderer.Initialize();
