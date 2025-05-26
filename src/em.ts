export class EventManager<T> {
    parent: T;
    
    events: {
        startTime: number,
        event: (dt: number, p: T) => void,
        duration: number
    }[];

    constructor(parent: T) {
        this.parent = parent; 
        this.events = [];
    }
    
    addEvent(event: (dt: number, p: T) => void, length: number = 0) {
        this.events.push({
            event,
            duration: length,
            startTime: performance.now()
        });
    }

    update() {
        const time = performance.now();
        const toRemove: EventManager<T>["events"] = [];
        for (const event of this.events) {
            if (event.duration + event.startTime < time) toRemove.push(event);
            event.event(time - event.duration, this.parent);
        }
        
        this.events = this.events.filter(a => !toRemove.includes(a));
    }
}