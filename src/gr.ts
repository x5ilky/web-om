import type { Game } from "./game";

export class GameRenderer {
    parent: Game;
    opacity = 1.0;
    mapStartTime = 0;
    scrollSpeed = 2.0;
    hitLocation = 100;
    od = 7;

    marvelous = 0;
    perfect = 0;
    great = 0;
    good = 0;
    ok = 0;
    miss = 0;

    constructor(parent: Game) {
        this.parent = parent;
    }
    
    startMap() {
        this.mapStartTime = performance.now();
    }
    
    draw() {
        const t = performance.now() - this.mapStartTime;
        const ctx = this.parent.context;
        
        
        for (const circle of this.parent.notes) {
            if (circle.hit) continue;
            const path = new Path2D();
            path.arc(this.laneToX(circle.lane), ctx.canvas.height - (circle.time - t) * this.scrollSpeed - this.hitLocation, 100, 0, 360);
            ctx.fillStyle = `rgba(255, 255, 255, ${this.opacity})`;
            ctx.fill(path);
        }
        
        const iToK = ["d", "f", "j", "k"];
        for (let i = 0; i < 4; i++) {
            const path = new Path2D();
            path.arc(this.laneToX(i), ctx.canvas.height - this.hitLocation, 100, 0, 360);
            
            if (this.parent.keymap.get(iToK[i]) ?? false) {
                ctx.fillStyle = `rgba(255, 255, 255, ${this.opacity})`;
                ctx.fill(path);
            } else {
                ctx.strokeStyle = `rgba(255, 255, 255, ${this.opacity})`;
                ctx.stroke(path);
            }
            
        }
        ctx.fillStyle = "white";
        ctx.font = "48px Arial";
        ctx.fillText(`320: ${this.marvelous}`, 20, 100);
        ctx.fillText(`300: ${this.perfect}`, 20, 200);
        ctx.fillText(`200: ${this.great}`, 20, 300);
        ctx.fillText(`100: ${this.good}`, 20, 400);
        ctx.fillText(`50:  ${this.ok}`, 20, 500);
        ctx.fillText(`Miss:  ${this.miss}`, 20, 500);
    }
    
    laneToX(lane: number) {
        return lane * 200 + 100;
    }
}