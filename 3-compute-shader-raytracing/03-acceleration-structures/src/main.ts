import { Scene } from "./scene";
import { Renderer } from "./renderer";

const canvas : HTMLCanvasElement = <HTMLCanvasElement> document.getElementById("gfx-main");

const sphereCount: number = 8192;
const sphereCountLabel: HTMLElement = <HTMLElement> document.getElementById("sphere-count");
sphereCountLabel.innerText = sphereCount.toString();

const scene: Scene = new Scene(sphereCount);

const renderer = new Renderer(canvas, scene);

renderer.Initialize();
