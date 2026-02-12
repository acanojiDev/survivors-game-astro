import { Entity } from "./Entity";
import { Hunter } from "./Hunter";

export class Survivor extends Entity {
	constructor(x: number, y: number) {
		super(x, y, "#4ade80", "/assets/survivor.svg", 1.5);
	}

	update(entities: Entity[], canvasWidth: number, canvasHeight: number): void {
		const hunters = entities.filter(e => e instanceof Hunter) as Hunter[];

		// Find nearest hunter
		let nearestHunter: Hunter | null = null;
		let minDistance = 150; // Detection range

		for (const hunter of hunters) {
			const dist = this.distanceTo(hunter);
			if (dist < minDistance) {
				minDistance = dist;
				nearestHunter = hunter;
			}
		}

		if (nearestHunter) {
			this.moveAwayFrom(nearestHunter.x, nearestHunter.y);
		} else {
			// Idle random movement
			this.x += (Math.random() - 0.5) * 1;
			this.y += (Math.random() - 0.5) * 1;
		}

		this.checkBounds(canvasWidth, canvasHeight);
	}
}
