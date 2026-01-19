import { Scene } from "./scene";
import { Renderer } from "./renderer";

const canvas : HTMLCanvasElement = <HTMLCanvasElement> document.getElementById("gfx-main");

const scene: Scene = new Scene();

const renderer = new Renderer(canvas, scene);

renderer.Initialize();
