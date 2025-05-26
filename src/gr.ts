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


    constructor(parent: Game) {
        this.parent = parent;
    }
    
    startMap() {
        this.mapStartTime = performance.now() + 3000;
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
            const string = score !== 0 ? score.toString() : "MISS";
            if (dt < 100) {
                p.context.fillStyle = "white";
                p.context.font = "48px";
                p.context.textAlign = "center";
                p.context.fillText(string, p.context.canvas.width / 2, p.context.canvas.height / 2);
            } else {
                p.context.fillStyle = `rgba(255, 255, 255, ${(dt - 100) / 100})`;
                p.context.font = "48px";
                p.context.textAlign = "center";
                p.context.fillText(string, p.context.canvas.width / 2, p.context.canvas.height / 2);
            } 
        }, 200)
    }
    
    laneToX(lane: number) {
        return (lane - 1.5) * (this.parent.skin.circleSize * 2) + (this.parent.context.canvas.width / 2);
    }
}