export class Game {
    canvas: HTMLCanvasElement;
    context: CanvasRenderingContext2D;
    scale: number;
    constructor() {
        this.scale = 2;
        this.canvas = document.createElement("canvas");
        this.context = this.canvas.getContext("2d")!;
        this.refreshCanvas();
        window.addEventListener("resize", () => {
            this.refreshCanvas();
        })
    }
    
    refreshCanvas() {
        this.canvas.remove()
        this.canvas = document.createElement("canvas");
        document.body.appendChild(this.canvas);
        this.canvas.width = window.innerWidth * this.scale;
        this.canvas.height = window.innerHeight * this.scale;
        this.context = this.canvas.getContext("2d")!;
    }
    
    update() {
        this.context.fillStyle = "black";
        this.context.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }
}