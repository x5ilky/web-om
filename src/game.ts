import { OsuParser, type Beatmaps, type OsuFile } from "./parser";

export class Game {
    canvas: HTMLCanvasElement;
    context: CanvasRenderingContext2D;
    scale: number;
    beatmaps: Map<string, Beatmaps>;

    constructor() {
        this.scale = 2;
        this.canvas = document.createElement("canvas");
        this.context = this.canvas.getContext("2d")!;
        this.beatmaps = new Map();
        this.refreshCanvas();
        window.addEventListener("resize", () => {
            this.refreshCanvas();
        })
    }
    
    refreshCanvas() {
        this.canvas.remove();
        this.canvas = document.createElement("canvas");
        document.body.appendChild(this.canvas);
        this.canvas.width = window.innerWidth * this.scale;
        this.canvas.height = window.innerHeight * this.scale;
        this.context = this.canvas.getContext("2d")!;
        
        this.canvas.ondrop = (ev) => {
            console.log("File(s) dropped");

            // Prevent default behavior (Prevent file from being opened)
            ev.preventDefault();

            if (ev.dataTransfer?.items) {
                // Use DataTransferItemList interface to access the file(s)
                [...ev.dataTransfer.items].forEach(async (item, i) => {
                // If dropped items aren't files, reject them
                if (item.kind === "file") {
                    const file = item.getAsFile()!;
                    console.log(`… file[${i}].name = ${file.name}`);
                    await this.loadOSZ(file);
                }
                });
            } else {
                // Use DataTransfer interface to access the file(s)
                [...ev.dataTransfer!.files].forEach(async (file, i) => {
                    console.log(`… file[${i}].name = ${file.name}`);
                    await this.loadOSZ(file);
                });
            }
        }
        this.canvas.ondragover = (ev) =>{
            // Prevent default behavior (Prevent file from being opened)
            ev.preventDefault();
        }

    }
    
    async loadOSZ(bytes: Blob) {
        const parser = new OsuParser(bytes);
        const obj = await parser.parse();
        console.log(obj)
    }
    
    update() {
        this.context.fillStyle = "black";
        this.context.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }
}