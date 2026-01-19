import { Scene } from "./scene";
import { Renderer } from "./renderer/renderer";

const canvas : HTMLCanvasElement = <HTMLCanvasElement> document.getElementById("gfx-main");

const sphereCountLabel: HTMLElement = <HTMLElement> document.getElementById("sphere-count");

const scene: Scene = new Scene();

const renderer = new Renderer(canvas, scene);

await renderer.Initialize();
