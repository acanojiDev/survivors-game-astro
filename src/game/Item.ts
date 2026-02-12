import { Entity } from "./Entity";

export class Item extends Entity {
	constructor(x: number, y: number) {
		super(x, y, "#facc15", "/assets/item.svg", 0, 'item'); // Speed 0 since it's static
	}

	update(_entities: Entity[], _canvasWidth: number, _canvasHeight: number): void {
		// Items don't move
	}
}
