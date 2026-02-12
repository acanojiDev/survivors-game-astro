import { Entity } from "./Entity";
import { Survivor } from "./Survivor";

export class Hunter extends Entity {
	constructor(x: number, y: number) {
		super(x, y, "#f87171", "/assets/hunter.svg", 2);
	}

	update(entities: Entity[], canvasWidth: number, canvasHeight: number): void {
		const survivors = entities.filter(e => e instanceof Survivor) as Survivor[];

		// Find nearest survivor
		let nearestSurvivor: Survivor | null = null;
		let minDistance = Infinity;

		for (const survivor of survivors) {
			const dist = this.distanceTo(survivor);
			if (dist < minDistance) {
				minDistance = dist;
				nearestSurvivor = survivor;
			}
		}

		if (nearestSurvivor) {
			this.moveTowards(nearestSurvivor.x, nearestSurvivor.y);

			// If hunter catches survivor, survivor "dies" (logic handled in GameWorld for better separation)
		}

		this.checkBounds(canvasWidth, canvasHeight);
	}
}
