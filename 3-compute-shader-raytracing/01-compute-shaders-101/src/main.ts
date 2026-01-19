import { Renderer } from "./renderer";

const canvas : HTMLCanvasElement = <HTMLCanvasElement> document.getElementById("gfx-main");

const renderer = new Renderer(canvas);

renderer.Initialize();
