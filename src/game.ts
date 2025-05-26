import $ from "jquery";
import { OsuParser, type Beatmaps, type OsuFile } from "./parser";
import { EventManager } from "./em";
import { GameRenderer } from "./gr";

export const GameState = {
    BeatmapSelect: 0,
    Game: 1
} as const;
export type GameState = (typeof GameState)[keyof typeof GameState];

export class Game {
    canvas: HTMLCanvasElement;
    context: CanvasRenderingContext2D;
    scale: number;
    beatmaps: Map<string, Beatmaps>;
    state: GameState;
    eventManager: EventManager<Game>;

    song: OsuFile;
    beatmap: Beatmaps;

    gameRenderer: GameRenderer;
    
    beatmapSelectElement: JQuery<HTMLDivElement>;

    constructor() {
        this.scale = 2;
        this.eventManager = new EventManager<Game>(this);
        this.gameRenderer = new GameRenderer(this);
        this.song = null as unknown as OsuFile;
        this.beatmap = null as unknown as Beatmaps;
        this.canvas = document.createElement("canvas");
        this.beatmapSelectElement = $("#beatmapSelect");
        this.context = this.canvas.getContext("2d")!;
        this.beatmaps = new Map();
        this.state = GameState.BeatmapSelect;
        this.updateChangeState();
        this.refreshCanvas();
        window.addEventListener("resize", () => {
            this.refreshCanvas();
        })
        setInterval(() => {
            this.update();
            this.eventManager.update();
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
                    await this.loadOSZ(file, file.name);
                }
                });
            } else {
                // Use DataTransfer interface to access the file(s)
                [...ev.dataTransfer!.files].forEach(async (file, i) => {
                    console.log(`… file[${i}].name = ${file.name}`);
                    await this.loadOSZ(file, file.name);
                });
            }
        }
        this.canvas.ondragover = (ev) =>{
            // Prevent default behavior (Prevent file from being opened)
            ev.preventDefault();
        }

    }
    
    async loadOSZ(bytes: Blob, filename: string) {
        const parser = new OsuParser(bytes, filename);
        const obj = await parser.parse();
        this.beatmaps.set(obj.files[0].Metadata.get("Title")!, obj);
        this.updateChangeState();
    }
    
    update() {
        this.context.fillStyle = "black";
        this.context.fillRect(0, 0, this.canvas.width, this.canvas.height);

        if (this.state === GameState.Game) this.updateGame();
    }

    updateGame() {
        this.gameRenderer.draw();
    }

    updateChangeState() {
        if (this.state === GameState.BeatmapSelect) this.beatmapSelectUpdate();
        else this.beatmapSelectElement.hide();
        if (this.state === GameState.Game) {
            this.eventManager.addEvent((dt, p) => {
                this.gameRenderer.opacity = dt / 200;
            }, 200)
        }
    }

    beatmapSelectUpdate() {
        this.beatmapSelectElement.show();
        
        this.beatmapSelectElement.html("");

        for (const [name, beatmapset] of this.beatmaps) {
            const elem = $(`
                <div>
                    <details class="beatmap-item" data-name=${JSON.stringify(name)}>
                        <summary>
                            ${beatmapset.name}
                        </summary>
                    </details>
                </div>
            `);
            beatmapset.files.forEach(a => {
                elem.children("details").eq(0).append(
                    $(`<div>${a.Metadata.get("Version")}</div>`).on("click", () => {
                        this.startSong(beatmapset, a);
                    })
                );
            })
            this.beatmapSelectElement.append(elem);
        }
    }

    startSong(set: Beatmaps, file: OsuFile) {
        this.state = GameState.Game;
        this.beatmap = set;
        this.song = file;
        this.gameRenderer.startMap();

        this.updateChangeState();
    }
}