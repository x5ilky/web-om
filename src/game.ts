import { OsuParser, type Beatmaps } from "./parser";

export const GameState = {
    BeatmapSelect: 0
} as const;
export type GameState = (typeof GameState)[keyof typeof GameState];

export class Game {
    canvas: HTMLCanvasElement;
    context: CanvasRenderingContext2D;
    scale: number;
    beatmaps: Map<string, Beatmaps>;
    state: GameState;
    
    beatmapSelectElement: HTMLDivElement;

    constructor() {
        this.scale = 2;
        this.canvas = document.createElement("canvas");
        this.beatmapSelectElement = document.querySelector("#beatmapSelect")!;
        this.context = this.canvas.getContext("2d")!;
        this.beatmaps = new Map();
        this.state = GameState.BeatmapSelect;
        this.refreshCanvas();
        window.addEventListener("resize", () => {
            this.refreshCanvas();
        })
        setInterval(() => {
            this.update();
        }, 0);
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
        this.beatmaps.set(obj.files[0].Metadata.get("Title")!, obj);
    }
    
    update() {
        this.context.fillStyle = "black";
        this.context.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        if (this.state === GameState.BeatmapSelect) this.beatmapSelectUpdate();
        else this.beatmapSelectElement.style.display = "none";
    }

    beatmapSelectUpdate() {
        this.beatmapSelectElement.style.display = "block";
        
        this.beatmapSelectElement.innerHTML = "";

        for (const [name, beatmapset] of this.beatmaps) {
            const elem = document.createElement("div");
            elem.innerHTML = `
                <div></div>
            `
        }
    }
}