import { Scene } from "./scene";
import { Renderer } from "./renderer";

const canvas : HTMLCanvasElement = <HTMLCanvasElement> document.getElementById("gfx-main");

const sphereCount: number = 1024;
const sphereCountLabel: HTMLElement = <HTMLElement> document.getElementById("sphere-count");
sphereCountLabel.innerText = sphereCount.toString();

const scene: Scene = new Scene(sphereCount);

//TODO: this is an async function, await it!
scene.make_scene();

const renderer = new Renderer(canvas, scene);

//TODO: this is an async function, await it!
renderer.Initialize();
