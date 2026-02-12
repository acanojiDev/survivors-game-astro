export abstract class Entity {
	x: number;
	y: number;
	size: number;
	color: string;
	speed: number;
	effects = {
		shield: 0,
		speedBoost: 0,
		invisible: 0
	};
	image: HTMLImageElement | null = null;
	imageSrc: string;

	constructor(x: number, y: number, color: string, imageSrc: string, speed: number = 2) {
		this.x = x;
		this.y = y;
		this.size = 15;
		this.color = color;
		this.imageSrc = imageSrc;
		this.speed = speed;

		if (typeof window !== 'undefined') {
			this.image = new Image();
			this.image.src = imageSrc;
		}
	}

	abstract update(entities: Entity[], canvasWidth: number, canvasHeight: number): void;

	draw(ctx: CanvasRenderingContext2D, camX: number = 0, camY: number = 0): void {
		const drawX = this.x - camX;
		const drawY = this.y - camY;
		const now = Date.now();

		// Draw glow if shielded
		if (this.effects.shield > now) {
			ctx.shadowBlur = 15;
			ctx.shadowColor = "#3b82f6";
			ctx.strokeStyle = "#3b82f6";
			ctx.lineWidth = 2;
			ctx.beginPath();
			ctx.arc(drawX, drawY, this.size + 5, 0, Math.PI * 2);
			ctx.stroke();
		}

		// Draw shadow
		ctx.shadowBlur = 0; // Reset for shadow
		ctx.fillStyle = "rgba(0,0,0,0.3)";
		ctx.beginPath();
		ctx.ellipse(drawX, drawY + this.size * 0.8, this.size * 0.8, this.size * 0.3, 0, 0, Math.PI * 2);
		ctx.fill();

		if (this.image && this.image.complete) {
			ctx.save();
			// Apply speed boost visual (motion blur or scaling?)
			if (this.effects.speedBoost > now) {
				ctx.filter = "brightness(1.5) saturate(1.5)";
			}

			ctx.drawImage(
				this.image,
				drawX - this.size,
				drawY - this.size,
				this.size * 2,
				this.size * 2
			);
			ctx.restore();
		} else {
			// Fallback to circle
			ctx.fillStyle = this.color;
			ctx.beginPath();
			ctx.arc(drawX, drawY, this.size, 0, Math.PI * 2);
			ctx.fill();
		}
	}

	distanceTo(other: Entity): number {
		const dx = this.x - other.x;
		const dy = this.y - other.y;
		return Math.sqrt(dx * dx + dy * dy);
	}

	protected moveTowards(targetX: number, targetY: number, speed?: number): void {
		const moveSpeed = speed ?? this.speed;
		const angle = Math.atan2(targetY - this.y, targetX - this.x);
		this.x += Math.cos(angle) * moveSpeed;
		this.y += Math.sin(angle) * moveSpeed;
	}

	protected moveAwayFrom(targetX: number, targetY: number, speed?: number): void {
		const moveSpeed = speed ?? this.speed;
		const angle = Math.atan2(targetY - this.y, targetX - this.x);
		this.x -= Math.cos(angle) * moveSpeed;
		this.y -= Math.sin(angle) * moveSpeed;
	}

	checkBounds(width: number, height: number): void {
		if (this.x < 0) this.x = 0;
		if (this.x > width) this.x = width;
		if (this.y < 0) this.y = 0;
		if (this.y > height) this.y = height;
	}
}
