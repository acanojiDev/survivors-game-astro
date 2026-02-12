import { Entity } from "./Entity";

export class Obstacle extends Entity {
	health: number;
	maxHealth: number;
	bubbles: { x: number, y: number, r: number, life: number }[] = [];

	constructor(x: number, y: number, width: number, height: number) {
		super(x, y, "#22c55e", "/assets/obstacle.svg", 0, 'obstacle');
		this.size = (width + height) / 4;
		this.maxHealth = 200;
		this.health = this.maxHealth;
	}

	update(entities: Entity[], width: number, height: number) {
		if (Math.random() < 0.1) {
			this.bubbles.push({
				x: (Math.random() - 0.5) * this.size * 1.5,
				y: (Math.random() - 0.5) * this.size * 1.5,
				r: 2 + Math.random() * 4,
				life: 1.0
			});
		}
		for (let i = this.bubbles.length - 1; i >= 0; i--) {
			this.bubbles[i].life -= 0.02;
			this.bubbles[i].y -= 0.5;
			if (this.bubbles[i].life <= 0) this.bubbles.splice(i, 1);
		}
	}

	draw(ctx: CanvasRenderingContext2D, camX: number, camY: number): void {
		const drawX = this.x - camX;
		const drawY = this.y - camY;

		// Toxic Glow
		ctx.save();
		const pulse = Math.sin(Date.now() / 400) * 0.2 + 0.8;
		const grad = ctx.createRadialGradient(drawX, drawY, 0, drawX, drawY, this.size * 2);
		grad.addColorStop(0, `rgba(34, 197, 94, ${0.4 * pulse})`);
		grad.addColorStop(1, "rgba(34, 197, 94, 0)");
		ctx.fillStyle = grad;
		ctx.beginPath();
		ctx.arc(drawX, drawY, this.size * 2, 0, Math.PI * 2);
		ctx.fill();

		// Polyp Body
		ctx.fillStyle = "#166534"; // Darker green
		ctx.beginPath();
		ctx.arc(drawX, drawY, this.size, 0, Math.PI * 2);
		ctx.fill();
		ctx.strokeStyle = "#4ade80";
		ctx.lineWidth = 2;
		ctx.stroke();

		// Bubbles
		for (const b of this.bubbles) {
			ctx.fillStyle = `rgba(187, 247, 208, ${b.life * 0.6})`;
			ctx.beginPath();
			ctx.arc(drawX + b.x, drawY + b.y, b.r, 0, Math.PI * 2);
			ctx.fill();
		}

		// Health bar
		if (this.health < this.maxHealth) {
			const barWidth = this.size * 1.5;
			const barHeight = 4;
			ctx.fillStyle = "rgba(0,0,0,0.5)";
			ctx.fillRect(drawX - barWidth / 2, drawY - this.size - 10, barWidth, barHeight);
			ctx.fillStyle = "#ef4444";
			ctx.fillRect(drawX - barWidth / 2, drawY - this.size - 10, barWidth * (this.health / this.maxHealth), barHeight);
		}
		ctx.restore();
	}
}
