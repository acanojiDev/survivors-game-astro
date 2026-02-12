import { Entity } from "./Entity";

export class Projectile extends Entity {
	directionX: number;
	directionY: number;
	distanceTraveled: number = 0;
	maxDistance: number = 400;

	constructor(x: number, y: number, targetX: number, targetY: number) {
		super(x, y, "#f87171", "/assets/projectile.svg", 5);
		this.size = 8;

		const angle = Math.atan2(targetY - y, targetX - x);
		this.directionX = Math.cos(angle);
		this.directionY = Math.sin(angle);
	}

	update(_entities: Entity[], _canvasWidth: number, _canvasHeight: number): void {
		const dx = this.directionX * this.speed;
		const dy = this.directionY * this.speed;

		this.x += dx;
		this.y += dy;
		this.distanceTraveled += Math.sqrt(dx * dx + dy * dy);
	}

	isExpired(): boolean {
		return this.distanceTraveled > this.maxDistance;
	}
}
