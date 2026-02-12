import { Entity } from "./Entity";
import { Hunter } from "./Hunter";
import { Item } from "./Item";

export class Survivor extends Entity {
	constructor(x: number, y: number) {
		super(x, y, "#4ade80", "/assets/survivor.svg", 1.5);
	}

	update(entities: Entity[], canvasWidth: number, canvasHeight: number): void {
		const hunters = entities.filter(e => e instanceof Hunter) as Hunter[];
		const items = entities.filter(e => e instanceof Item) as Item[];

		// 1. Flee from hunters first (highest priority)
		let nearestHunter: Hunter | null = null;
		let minHunterDist = 150;

		for (const hunter of hunters) {
			const dist = this.distanceTo(hunter);
			if (dist < minHunterDist) {
				minHunterDist = dist;
				nearestHunter = hunter;
			}
		}

		if (nearestHunter) {
			this.moveAwayFrom(nearestHunter.x, nearestHunter.y);
		}
		// 2. If no hunters nearby, seek nearest item
		else {
			let nearestItem: Item | null = null;
			let minItemDist = Infinity;

			for (const item of items) {
				const dist = this.distanceTo(item);
				if (dist < minItemDist) {
					minItemDist = dist;
					nearestItem = item;
				}
			}

			if (nearestItem) {
				this.moveTowards(nearestItem.x, nearestItem.y);
			} else {
				// Idle movement
				this.x += (Math.random() - 0.5) * 1;
				this.y += (Math.random() - 0.5) * 1;
			}
		}

		this.checkBounds(canvasWidth, canvasHeight);
	}
}
