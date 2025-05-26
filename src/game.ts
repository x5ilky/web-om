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

    skin: {
        circleR: number;
        circleG: number;
        circleB: number;
        outlineR: number;
        outlineG: number;
        outlineB: number;
        scrollSpeed: number;
        circleSize: number;
        hitLocation: number;
    };

    song: OsuFile;
    notes: HitCircle[];
    beatmap: Beatmaps;

    keymap: Map<string, boolean>;

    gameRenderer: GameRenderer;

    keybinds: string[];
    
    beatmapSelectElement: JQuery<HTMLDivElement>;

    constructor() {
        this.scale = 2;

        this.skin = {
            circleR: 176,
            circleG: 252,
            circleB: 194,
            outlineR: 255,
            outlineG: 255,
            outlineB: 255,
            scrollSpeed: 6.0,
            circleSize: 240,
            hitLocation: 340,
        }
        this.eventManager = new EventManager<Game>(this);
        this.gameRenderer = new GameRenderer(this);
        this.song = null as unknown as OsuFile;
        this.beatmap = null as unknown as Beatmaps;
        this.canvas = document.createElement("canvas");
        this.beatmapSelectElement = $("#beatmapSelect");
        this.context = this.canvas.getContext("2d")!;
        this.keybinds = ["d", "f", "j", "k"]
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
        setInterval(() => {
            localStorage.setItem("config", JSON.stringify({
                skin: this.skin,
                keybinds: this.keybinds
            }));
        }, 100);

        this.tryLoadConfig();
        this.setupInputs();
    }

    tryLoadConfig() {
        const p = localStorage.getItem("config");
        if (p) {
            const s = JSON.parse(p);
            console.log(s)
            if (s?.skin?.circleR) this.skin.circleR = s.skin.circleR;
            if (s?.skin?.circleG) this.skin.circleG = s.skin.circleG;
            if (s?.skin?.circleB) this.skin.circleB = s.skin.circleB;
            if (s?.skin?.outlineR) this.skin.outlineR = s.skin.outlineR;
            if (s?.skin?.outlineG) this.skin.outlineG = s.skin.outlineG;
            if (s?.skin?.outlineB) this.skin.outlineB = s.skin.outlineB;
            if (s?.skin?.scrollSpeed) this.skin.scrollSpeed = s.skin.scrollSpeed;
            if (s?.skin?.circleSize) this.skin.circleSize = s.skin.circleSize;
            if (s?.skin?.hitLocation) this.skin.hitLocation = s.skin.hitLocation;
            if (s?.keybinds) this.keybinds = s.keybinds;
        }
    }
    setupInputs() {
        $("#scrollspeed").val(this.skin.scrollSpeed).on("input", () => {
            this.skin.scrollSpeed = $("#scrollspeed").val() as number;
        })
        $("#circlesize").val(this.skin.circleSize).on("input", () => {
            this.skin.circleSize = $("#circlesize").val() as number;
        })
        $("#lineheight").val(this.skin.hitLocation).on("input", () => {
            this.skin.hitLocation = $("#lineheight").val() as number;
        })
        $("#lane1key").val(this.keybinds[0]).on("input", () => {
            this.keybinds[0] = $("#lane1key").val() as string;
        })
        $("#lane2key").val(this.keybinds[1]).on("input", () => {
            this.keybinds[1] = $("#lane2key").val() as string;
        })
        $("#lane3key").val(this.keybinds[2]).on("input", () => {
            this.keybinds[2] = $("#lane3key").val() as string;
        })
        $("#lane4key").val(this.keybinds[3]).on("input", () => {
            this.keybinds[3] = $("#lane4key").val() as string;
        })
        $("#circleR").val(this.skin.circleR).on("input", () => { this.skin.circleR = $("#circleR").val() as number; })
        $("#circleG").val(this.skin.circleG).on("input", () => { this.skin.circleG = $("#circleG").val() as number; })
        $("#circleB").val(this.skin.circleB).on("input", () => { this.skin.circleB = $("#circleB").val() as number; })
        $("#outlineR").val(this.skin.outlineR).on("input", () => { this.skin.outlineR = $("#outlineR").val() as number; })
        $("#outlineG").val(this.skin.outlineG).on("input", () => { this.skin.outlineG = $("#outlineG").val() as number; })
        $("#outlineB").val(this.skin.outlineB).on("input", () => { this.skin.outlineB = $("#outlineB").val() as number; })
        // $("#y").val(x).on("input", () => { x = $("#y").val() as string; })
        // $("#y").val(x).on("input", () => { x = $("#y").val() as string; })
        // $("#y").val(x).on("input", () => { x = $("#y").val() as string; })
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
            if (this.keybinds.includes(key)) this.clickLane(this.keybinds.findIndex(a => a === key)); 
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
        const aCtx = new (window.AudioContext || (window as any).webkitAudioContext)();

        // Convert Uint8Array to ArrayBuffer
        const arrayBuffer = byteArray.buffer;

        try {
            // Decode the audio data
            const audioBuffer = await aCtx.decodeAudioData(arrayBuffer);

            // Create a buffer source
            const gainNode = aCtx.createGain()
            gainNode.gain.value = 0.1 // 10 %
            gainNode.connect(aCtx.destination)
            const source = aCtx.createBufferSource();
            source.buffer = audioBuffer;
            // now instead of connecting to aCtx.destination, connect to the gainNode
            source.connect(gainNode)
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