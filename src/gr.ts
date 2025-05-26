import type { Game } from "./game";

export class GameRenderer {
    parent: Game;
    opacity = 1.0;
    mapStartTime = 0;
    scrollSpeed = 2.0;
    hitLocation = 100;

    constructor(parent: Game) {
        this.parent = parent;
    }
    
    startMap() {
        this.mapStartTime = performance.now();
    }
    
    draw() {
        const t = performance.now() - this.mapStartTime;
        const ctx = this.parent.context;
        
        

        for (const circle of this.parent.song.HitObjects) {
            const path = new Path2D();
            const lane = Math.floor(circle.x * 4 / 512)
            path.arc(this.laneToX(lane), ctx.canvas.height - (circle.time - t) * this.scrollSpeed - this.hitLocation, 100, 0, 360);
            ctx.fillStyle = "white";
            ctx.fill(path);
        }
        
        for (let i = 0; i < 4; i++) {
            const path = new Path2D();
            path.arc(this.laneToX(i), ctx.canvas.height - this.hitLocation, 100, 0, 360);
            ctx.strokeStyle = "white";
            ctx.stroke(path);
            
        }
    }
    
    laneToX(lane: number) {
        return lane * 200 + 100;
    }
}