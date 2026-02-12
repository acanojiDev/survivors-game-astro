import { Entity } from "./Entity";
import { Hunter } from "./Hunter";

export class Drone extends Entity {
	parent: Entity;
	orbitAngle: number;
	orbitRadius: number = 60;
	lastShootTime: number = 0;
	shootCooldown: number = 1500;
	laserTarget: { x: number, y: number, time: number } | null = null;

	constructor(parent: Entity, startAngle: number) {
		super(parent.x, parent.y, "#60a5fa", "", 1, 'drone');
		this.parent = parent;
		this.orbitAngle = startAngle;
		this.size = 8;
	}

	update(entities: Entity[]): void {
		const now = Date.now();
		// Orbit logic
		this.orbitAngle += 0.05;
		this.x = this.parent.x + Math.cos(this.orbitAngle) * this.orbitRadius;
		this.y = this.parent.y + Math.sin(this.orbitAngle) * this.orbitRadius;

		// Shoot logic
		if (now - this.lastShootTime > this.shootCooldown) {
			const target = this.findNearestHunter(entities);
			if (target) {
				this.lastShootTime = now;
				this.laserTarget = { x: target.x, y: target.y, time: now + 150 };
			}
		}

		if (this.laserTarget && now > this.laserTarget.time) {
			this.laserTarget = null;
		}
	}

	private findNearestHunter(entities: Entity[]): Hunter | null {
		let nearest: Hunter | null = null;
		let minDist = 400; // Laser range

		for (const e of entities) {
			if (e.type === 'hunter') {
				const dist = this.distanceTo(e);
				if (dist < minDist) {
					minDist = dist;
					nearest = e as Hunter;
				}
			}
		}
		return nearest;
	}

	draw(ctx: CanvasRenderingContext2D, camX: number, camY: number): void {
		const drawX = this.x - camX;
		const drawY = this.y - camY;

		// Draw drone body (Triangle/Diamond)
		ctx.save();
		ctx.translate(drawX, drawY);
		ctx.rotate(this.orbitAngle + Math.PI / 2);
		ctx.fillStyle = this.color;
		ctx.shadowBlur = 10;
		ctx.shadowColor = this.color;

		ctx.beginPath();
		ctx.moveTo(0, -this.size);
		ctx.lineTo(this.size, this.size);
		ctx.lineTo(-this.size, this.size);
		ctx.closePath();
		ctx.fill();
		ctx.restore();

		// Draw Laser
		if (this.laserTarget) {
			ctx.save();
			ctx.strokeStyle = "cyan";
			ctx.lineWidth = 2;
			ctx.shadowBlur = 15;
			ctx.shadowColor = "cyan";
			ctx.beginPath();
			ctx.moveTo(drawX, drawY);
			ctx.lineTo(this.laserTarget.x - camX, this.laserTarget.y - camY);
			ctx.stroke();
			ctx.restore();
		}
	}
}
