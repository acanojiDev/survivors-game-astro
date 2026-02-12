import { Entity } from "./Entity";

export class Obstacle extends Entity {
	constructor(x: number, y: number, size: number = 40) {
		super(x, y, "#334155", "/assets/obstacle.svg", 0);
		this.size = size;
	}

	update(): void {
		// Static
	}
}
