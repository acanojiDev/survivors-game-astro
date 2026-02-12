import type { Entity } from "./Entity";
import { Survivor } from "./Survivor";
import { Hunter } from "./Hunter";
import { Item } from "./Item";
import { Projectile } from "./Projectile";

export class GameWorld {
	entities: Entity[] = [];
	width: number;
	height: number;
	score: number = 0;
	onScoreUpdate: (score: number) => void;
	onGameStateChange: (state: 'playing' | 'survivorsWin' | 'huntersWin') => void;
	state: 'playing' | 'survivorsWin' | 'huntersWin' = 'playing';

	constructor(
		width: number,
		height: number,
		onScoreUpdate: (s: number) => void,
		onStateChange: (state: 'playing' | 'survivorsWin' | 'huntersWin') => void
	) {
		this.width = width;
		this.height = height;
		this.onScoreUpdate = onScoreUpdate;
		this.onGameStateChange = onStateChange;
		this.init();
	}

	init() {
		this.entities = [];
		this.score = 0;
		this.state = 'playing';
		this.onScoreUpdate(0);
		this.onGameStateChange('playing');

		// Add survivors
		for (let i = 0; i < 15; i++) {
			this.entities.push(new Survivor(
				Math.random() * this.width,
				Math.random() * this.height
			));
		}

		// Add hunters
		for (let i = 0; i < 2; i++) {
			this.entities.push(new Hunter(
				Math.random() * this.width,
				Math.random() * this.height,
				(x, y, tx, ty) => {
					this.entities.push(new Projectile(x, y, tx, ty));
				}
			));
		}

		// Initial items
		for (let i = 0; i < 5; i++) {
			this.spawnItem();
		}
	}

	spawnItem() {
		this.entities.push(new Item(
			50 + Math.random() * (this.width - 100),
			50 + Math.random() * (this.height - 100)
		));
	}

	update() {
		if (this.state !== 'playing') return;

		const hunters = this.entities.filter(e => e instanceof Hunter) as Hunter[];
		const survivors = this.entities.filter(e => e instanceof Survivor) as Survivor[];
		const items = this.entities.filter(e => e instanceof Item) as Item[];
		const projectiles = this.entities.filter(e => e instanceof Projectile) as Projectile[];

		// 1. Hunter catches Survivor (physical touch)
		for (const hunter of hunters) {
			for (let i = survivors.length - 1; i >= 0; i--) {
				const survivor = survivors[i];
				if (hunter.distanceTo(survivor) < (hunter.size + survivor.size)) {
					const index = this.entities.indexOf(survivor);
					if (index > -1) this.entities.splice(index, 1);
				}
			}
		}

		// 2. Projectile hits Survivor
		for (const projectile of projectiles) {
			for (let i = survivors.length - 1; i >= 0; i--) {
				const survivor = survivors[i];
				if (projectile.distanceTo(survivor) < (projectile.size + survivor.size)) {
					// Hit! Remove survivor and projectile
					const sIndex = this.entities.indexOf(survivor);
					if (sIndex > -1) this.entities.splice(sIndex, 1);

					const pIndex = this.entities.indexOf(projectile);
					if (pIndex > -1) this.entities.splice(pIndex, 1);
					break; // Projectile is gone
				}
			}
		}

		// 3. Survivor picks up Item
		for (const survivor of survivors) {
			for (let i = items.length - 1; i >= 0; i--) {
				const item = items[i];
				if (survivor.distanceTo(item) < (survivor.size + item.size)) {
					const index = this.entities.indexOf(item);
					if (index > -1) {
						this.entities.splice(index, 1);
						this.score++;
						this.onScoreUpdate(this.score);
						this.spawnItem();
					}
				}
			}
		}

		// 4. Clean up expired projectiles
		for (const projectile of projectiles) {
			if (projectile.isExpired()) {
				const index = this.entities.indexOf(projectile);
				if (index > -1) this.entities.splice(index, 1);
			}
		}

		// 5. Win/Loss Conditions
		if (survivors.length === 0) {
			this.state = 'huntersWin';
			this.onGameStateChange('huntersWin');
		} else if (this.score >= 20) {
			this.state = 'survivorsWin';
			this.onGameStateChange('survivorsWin');
		}

		// 6. Update all entities
		for (const entity of this.entities) {
			entity.update(this.entities, this.width, this.height);
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
