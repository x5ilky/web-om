import $ from "jquery"
import type { Game } from "./game";

export class GameRenderer {
    parent: Game;
    opacity = 1.0;
    mapStartTime = 0;
    od = 7;

    marvelous = 0;
    perfect = 0;
    great = 0;
    good = 0;
    ok = 0;
    miss = 0;
    lastDT = 0xffffffff;

    marvelousTexture = $("<img>").attr("src", "./mania-hit300g.png")[0] as HTMLImageElement;
    perfectTexture = $("<img>").attr("src", "./mania-hit300.png")[0] as HTMLImageElement;
    greatTexture = $("<img>").attr("src", "./mania-hit200.png")[0] as HTMLImageElement;
    goodTexture = $("<img>").attr("src", "./mania-hit100.png")[0] as HTMLImageElement;
    okTexture = $("<img>").attr("src", "./mania-hit50.png")[0] as HTMLImageElement;
    missTexture = $("<img>").attr("src", "./mania-hit0.png")[0] as HTMLImageElement;

    constructor(parent: Game) {
        this.parent = parent;


    }
    
    startMap() {
        this.marvelous = 0;
        this.perfect = 0;
        this.great = 0;
        this.good = 0;
        this.ok = 0;
        this.miss = 0;
        this.mapStartTime = performance.now() + parseFloat(this.parent.song.General.get("AudioLeadIn")!);
        this.lastDT = this.parent.notes.slice(-1)[0].time;
    }
    
    draw() {
        const t = performance.now() - this.mapStartTime;
        const ctx = this.parent.context;
        
        
        for (const circle of this.parent.notes) {
            if (circle.hit) continue;
            const path = new Path2D();
            path.arc(this.laneToX(circle.lane), ctx.canvas.height - ((circle.time - t) * this.parent.skin.scrollSpeed + this.parent.skin.hitLocation), this.parent.skin.circleSize, 0, 360);
            ctx.fillStyle = `rgba(${this.parent.skin.circleR}, ${this.parent.skin.circleG}, ${this.parent.skin.circleB}, ${this.opacity})`;
            ctx.fill(path);
        }
        
        for (let i = 0; i < 4; i++) {
            const path = new Path2D();
            path.arc(this.laneToX(i), ctx.canvas.height - this.parent.skin.hitLocation, this.parent.skin.circleSize, 0, 360);
            
            if (this.parent.keymap.get(this.parent.keybinds[i]) ?? false) {
                ctx.fillStyle = `rgba(${this.parent.skin.outlineR}, ${this.parent.skin.outlineG}, ${this.parent.skin.outlineB}, ${this.opacity})`;
                ctx.fill(path);
            } else {
                ctx.strokeStyle = `rgba(${this.parent.skin.outlineR}, ${this.parent.skin.outlineG}, ${this.parent.skin.outlineB}, ${this.opacity})`;
                ctx.stroke(path);
            }
            
        }
        ctx.fillStyle = "white";
        ctx.font = "48px Arial";
        ctx.textAlign = "left";
        ctx.fillText(`320: ${this.marvelous}`, 20, 100);
        ctx.fillText(`300: ${this.perfect}`, 20, 200);
        ctx.fillText(`200: ${this.great}`, 20, 300);
        ctx.fillText(`100: ${this.good}`, 20, 400);
        ctx.fillText(`50:  ${this.ok}`, 20, 500);
        ctx.fillText(`Miss:  ${this.miss}`, 20, 600);
        ctx.fillText(`Accuracy:  ${(this.accuracy * 100).toFixed(2)}%`, 20, 800);
    }

    get accuracy() {
        return (
            305 * this.marvelous + 300 * this.perfect + 200 * this.great + 100  * this.good + 50 * this.ok
        ) / (
            305 * (this.marvelous + this.perfect + this.great + this.good + this.ok + this.miss)
        );
    }

    queueHitMarker(score: number) {
        this.parent.eventManager.addEvent((dt, p) => {
            console.log(score)
            const texture = (() => {
                switch (score) {
                    case 320: return this.marvelousTexture;
                    case 300: return this.perfectTexture;
                    case 200: return this.greatTexture;
                    case 100: return this.goodTexture;
                    case  50: return this.okTexture;
                    case   0: return this.missTexture;
                    default : return this.missTexture;
                }
            })();

            p.context.drawImage(texture, p.context.canvas.width / 2 - texture.width / 2, p.context.canvas.height / 2 - texture.height / 2);
        }, 200)
    }
    
    laneToX(lane: number) {
        return (lane - 1.5) * (this.parent.skin.circleSize * 2) + (this.parent.context.canvas.width / 2);
    }
}