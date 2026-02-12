import { Entity } from "./Entity";
import { Hunter } from "./Hunter";
import { Item } from "./Item";

export class Survivor extends Entity {
	constructor(x: number, y: number) {
		super(x, y, "#4ade80", "/assets/survivor.svg", 1.5);
	}

	dashCooldown: number = 3000;
	lastDashTime: number = 0;

	update(entities: Entity[], canvasWidth: number, canvasHeight: number): void {
		const now = Date.now();
		const hunters = entities.filter(e => e instanceof Hunter) as Hunter[];
		const items = entities.filter(e => e instanceof Item) as Item[];

		// Use constructor name to avoid circular dependency/type issues in some environments
		const projectiles = entities.filter(e => e.constructor.name === 'Projectile');

		// Handle effects
		const currentSpeed = this.effects.speedBoost > now ? this.speed * 2.5 : this.speed;

		// 1. Dash logic: boost away if projectile is close
		for (const p of projectiles) {
			if (this.distanceTo(p) < 60 && now - this.lastDashTime > this.dashCooldown) {
				this.effects.speedBoost = now + 600; // 0.6s dash
				this.lastDashTime = now;
				break;
			}
		}

		// 2. Flee from hunters first (highest priority)
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
			this.moveAwayFrom(nearestHunter.x, nearestHunter.y, currentSpeed);
		}
		// 3. If no hunters nearby, seek nearest item
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
				this.moveTowards(nearestItem.x, nearestItem.y, currentSpeed);
			} else {
				// Idle movement
				this.x += (Math.random() - 0.5) * currentSpeed;
				this.y += (Math.random() - 0.5) * currentSpeed;
			}
		}

		this.checkBounds(canvasWidth, canvasHeight);
	}
}
