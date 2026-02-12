import type { Entity } from "./Entity";
import { Survivor } from "./Survivor";
import { Hunter } from "./Hunter";

export class GameWorld {
	entities: Entity[] = [];
	width: number;
	height: number;

	constructor(width: number, height: number) {
		this.width = width;
		this.height = height;
		this.init();
	}

	init() {
		// Add survivors
		for (let i = 0; i < 20; i++) {
			this.entities.push(new Survivor(
				Math.random() * this.width,
				Math.random() * this.height
			));
		}

		// Add hunters
		for (let i = 0; i < 3; i++) {
			this.entities.push(new Hunter(
				Math.random() * this.width,
				Math.random() * this.height
			));
		}
	}

	update() {
		// Catch survivors logic
		const hunters = this.entities.filter(e => e instanceof Hunter) as Hunter[];
		const survivors = this.entities.filter(e => e instanceof Survivor) as Survivor[];

		for (const hunter of hunters) {
			for (let i = survivors.length - 1; i >= 0; i--) {
				const survivor = survivors[i];
				if (hunter.distanceTo(survivor) < (hunter.size + survivor.size)) {
					// Remove survivor
					const index = this.entities.indexOf(survivor);
					if (index > -1) {
						this.entities.splice(index, 1);
					}
				}
			}
		}

		// Update all entities
		for (const entity of this.entities) {
			entity.update(this.entities, this.width, this.height);
		}

		// Respawn survivors if empty
		if (this.entities.filter(e => e instanceof Survivor).length === 0) {
			this.init();
		}
	}

	draw(ctx: CanvasRenderingContext2D) {
		ctx.clearRect(0, 0, this.width, this.height);

		// Draw grid background
		ctx.strokeStyle = "#334155";
		ctx.lineWidth = 0.5;
		for (let i = 0; i < this.width; i += 50) {
			ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, this.height); ctx.stroke();
		}
		for (let i = 0; i < this.height; i += 50) {
			ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(this.width, i); ctx.stroke();
		}

		for (const entity of this.entities) {
			entity.draw(ctx);
		}
	}
}
