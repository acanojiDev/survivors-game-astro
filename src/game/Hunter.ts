import { Entity } from "./Entity";
import { Survivor } from "./Survivor";

export class Hunter extends Entity {
	lastShotTime: number = 0;
	shootCooldown: number = 2000; // 2 seconds
	onShoot: (x: number, y: number, tx: number, ty: number) => void;

	constructor(x: number, y: number, onShoot: (x: number, y: number, tx: number, ty: number) => void) {
		super(x, y, "#f87171", "/assets/hunter.svg", 2);
		this.onShoot = onShoot;
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

			// Shooting logic
			const now = Date.now();
			if (minDistance < 300 && now - this.lastShotTime > this.shootCooldown) {
				this.onShoot(this.x, this.y, nearestSurvivor.x, nearestSurvivor.y);
				this.lastShotTime = now;
			}
		}

		this.checkBounds(canvasWidth, canvasHeight);
	}
}
