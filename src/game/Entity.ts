export abstract class Entity {
	x: number;
	y: number;
	size: number;
	color: string;
	speed: number;

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

	draw(ctx: CanvasRenderingContext2D): void {
		// Draw shadow
		ctx.fillStyle = "rgba(0,0,0,0.3)";
		ctx.beginPath();
		ctx.ellipse(this.x, this.y + this.size * 0.8, this.size * 0.8, this.size * 0.3, 0, 0, Math.PI * 2);
		ctx.fill();

		if (this.image && this.image.complete) {
			ctx.drawImage(
				this.image,
				this.x - this.size,
				this.y - this.size,
				this.size * 2,
				this.size * 2
			);
		} else {
			// Fallback to circle
			ctx.fillStyle = this.color;
			ctx.beginPath();
			ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
			ctx.fill();
		}
	}

	distanceTo(other: Entity): number {
		const dx = this.x - other.x;
		const dy = this.y - other.y;
		return Math.sqrt(dx * dx + dy * dy);
	}

	protected moveTowards(targetX: number, targetY: number): void {
		const angle = Math.atan2(targetY - this.y, targetX - this.x);
		this.x += Math.cos(angle) * this.speed;
		this.y += Math.sin(angle) * this.speed;
	}

	protected moveAwayFrom(targetX: number, targetY: number): void {
		const angle = Math.atan2(targetY - this.y, targetX - this.x);
		this.x -= Math.cos(angle) * this.speed;
		this.y -= Math.sin(angle) * this.speed;
	}

	checkBounds(width: number, height: number): void {
		if (this.x < 0) this.x = 0;
		if (this.x > width) this.x = width;
		if (this.y < 0) this.y = 0;
		if (this.y > height) this.y = height;
	}
}
