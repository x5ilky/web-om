import $ from "jquery";
import { OsuParser, type Beatmaps, type OsuFile } from "./parser";
import { EventManager } from "./em";
import { GameRenderer } from "./gr";

export const GameState = {
    BeatmapSelect: 0,
    Game: 1
} as const;
export type GameState = (typeof GameState)[keyof typeof GameState];

export type HitCircle = {
    type: "normal",
    lane: number,
    time: number,
    hit: boolean
}

export class Game {
    canvas: HTMLCanvasElement;
    context: CanvasRenderingContext2D;
    scale: number;
    beatmaps: Map<string, Beatmaps>;
    state: GameState;
    eventManager: EventManager<Game>;
    audio: AudioBufferSourceNode | null = null;

    song: OsuFile;
    notes: HitCircle[];
    beatmap: Beatmaps;

    keymap: Map<string, boolean>;

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
        this.notes = [];
        this.beatmaps = new Map();
        this.keymap = new Map();
        this.state = GameState.BeatmapSelect;
        this.updateChangeState();
        this.refreshCanvas();
        window.addEventListener("resize", () => {
            this.refreshCanvas();
        })
        document.addEventListener("keypress", ev => {
            this.onClick(ev.key);
        })
        document.addEventListener("keydown", ev => {
            this.keyDown(ev.key);
        })
        document.addEventListener("keyup", ev => {
            this.keyUp(ev.key);
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
    
    onClick(key: string) {
        if (this.state === GameState.Game) {
            const keyToL = {
                "d": 0,
                "f": 1,
                "j": 2,
                "k": 3,
            };
            if (key in keyToL) this.clickLane(keyToL[key as keyof typeof keyToL]); 
        }
    }
    
    clickLane(lane: number) {
        const firstN = this.notes.find(a => !a.hit && a.lane === lane);
        if (firstN) {
            const td = Math.abs(firstN.time - (performance.now() - this.gameRenderer.mapStartTime));
            
            let score = 0;
            if (td <= 16) {
                score = 320; 
                this.gameRenderer.marvelous++;
                firstN.hit = true;
            } else if (td <= 64 - 3 * this.gameRenderer.od) {
                score = 300
                this.gameRenderer.perfect++;
                firstN.hit = true;
            } else if (td <= 97 - 3 * this.gameRenderer.od) {
                score = 200
                this.gameRenderer.great++;
                firstN.hit = true;
            } else if (td <= 127 - 3 * this.gameRenderer.od) {
                score = 100
                this.gameRenderer.good++;
                firstN.hit = true;
            } else if (td <= 151 - 3 * this.gameRenderer.od) {
                score = 50
                this.gameRenderer.ok++;
            } else {
                // miss
                this.gameRenderer.miss++;
            }
            this.gameRenderer.queueHitMarker(score)
        }
    }
    keyDown(key: string) {
        if (this.state === GameState.Game) {
            if (key === "Escape") {
                this.state = GameState.BeatmapSelect;
                this.audio?.stop();
                this.updateChangeState();
            }
        }
        this.keymap.set(key, true)
    }
    keyUp(key: string) {
        this.keymap.set(key, false)
    }
    async playAudioFromBytes(byteArray: Uint8Array) {
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();

        // Convert Uint8Array to ArrayBuffer
        const arrayBuffer = byteArray.buffer;

        try {
            // Decode the audio data
            const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

            // Create a buffer source
            const source = audioContext.createBufferSource();
            source.buffer = audioBuffer;
            source.connect(audioContext.destination);
            return source;
        } catch (e) {
            console.error("Error decoding audio data:", e);
            throw new Error();
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
        this.eventManager.update();
    }

    updateGame() {
        const time = performance.now() - this.gameRenderer.mapStartTime;

        if (time > this.gameRenderer.lastDT + 4000) {
            this.audio?.stop();
            this.audio = null;
            this.state = GameState.BeatmapSelect;
            this.updateChangeState();
            return;
        }

        for (const circle of this.notes) {
            if (!circle.hit && circle.time - time < -(151 - 3 * this.gameRenderer.od)) {
                circle.hit = true;
                this.gameRenderer.miss++;
            }
        }
        this.gameRenderer.draw();
    }

    updateChangeState() {
        if (this.state === GameState.BeatmapSelect) this.beatmapSelectUpdate();
        else this.beatmapSelectElement.hide();
        if (this.state === GameState.Game) {
            this.eventManager.addEvent((dt, _p) => {
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
                    $(`<div>${a.Metadata.get("Version")}</div>`).on("click", async () => {
                        await this.startSong(beatmapset, a);
                    })
                );
            })
            this.beatmapSelectElement.append(elem);
        }
    }

    startSong(set: Beatmaps, file: OsuFile) {
        this.state = GameState.Game;
        this.beatmap = set;
        this.gameRenderer.mapStartTime = 0xfffffffffff;
        this.song = file;
        this.notes = [];
        file.HitObjects.forEach(a => {
            this.notes.push({
                type: "normal",
                hit: false,
                lane: Math.floor(a.x * 4 / 512),
                time: a.time,
            });
        });
        const a = this.beatmap.resources.get(file.General.get("AudioFilename")!)!;
        (async () => {
            this.audio = await this.playAudioFromBytes(a)
            this.audio.start(3);
            this.gameRenderer.startMap();

            this.updateChangeState();
        })();
    }
}