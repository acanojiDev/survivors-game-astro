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

	update(entities: Entity[], canvasWidth: number, canvasHeight: number, score: number = 0): void {
		const survivors = entities.filter(e => e instanceof Survivor) as Survivor[];

		// Berserk logic: Speed increases based on survivors' score
		const currentSpeed = this.speed + (score * 0.1);

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
			this.moveTowards(nearestSurvivor.x, nearestSurvivor.y, currentSpeed);

			// Shooting logic (Triple Shot every 3rd shot)
			const now = Date.now();
			if (minDistance < 300 && now - this.lastShotTime > this.shootCooldown) {
				// Triple Shot
				const angle = Math.atan2(nearestSurvivor.y - this.y, nearestSurvivor.x - this.x);
				this.onShoot(this.x, this.y, this.x + Math.cos(angle) * 100, this.y + Math.sin(angle) * 100);
				this.onShoot(this.x, this.y, this.x + Math.cos(angle - 0.2) * 100, this.y + Math.sin(angle - 0.2) * 100);
				this.onShoot(this.x, this.y, this.x + Math.cos(angle + 0.2) * 100, this.y + Math.sin(angle + 0.2) * 100);

				this.lastShotTime = now;
			}
		}

		this.checkBounds(canvasWidth, canvasHeight);
	}

	protected moveTowards(targetX: number, targetY: number, speed: number): void {
		const angle = Math.atan2(targetY - this.y, targetX - this.x);
		this.x += Math.cos(angle) * speed;
		this.y += Math.sin(angle) * speed;
	}
}
