import type { Entity } from "./Entity";
import { Survivor } from "./Survivor";
import { Hunter } from "./Hunter";
import { Item } from "./Item";
import { Projectile } from "./Projectile";
import { PowerUp } from "./PowerUp";
import { Obstacle } from "./Obstacle";

export class GameWorld {
	entities: Entity[] = [];
	width: number = 2000;
	height: number = 2000;
	viewWidth: number;
	viewHeight: number;
	score: number = 0;
	onScoreUpdate: (score: number) => void;
	onGameStateChange: (state: 'playing' | 'survivorsWin' | 'huntersWin') => void;
	state: 'playing' | 'survivorsWin' | 'huntersWin' = 'playing';

	particles: { x: number, y: number, color: string, life: number }[] = [];
	screenShake: number = 0;
	camera = { x: 0, y: 0 };
	killFeed: { msg: string, time: number }[] = [];
	hasSpawnedBoss: boolean = false;

	constructor(
		viewWidth: number,
		viewHeight: number,
		onScoreUpdate: (s: number) => void,
		onStateChange: (state: 'playing' | 'survivorsWin' | 'huntersWin') => void
	) {
		this.viewWidth = viewWidth;
		this.viewHeight = viewHeight;
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
		this.particles = [];
		this.screenShake = 0;
		this.killFeed = [];
		this.hasSpawnedBoss = false;
		this.camera = { x: this.width / 2 - this.viewWidth / 2, y: this.height / 2 - this.viewHeight / 2 };

		// Add obstacles
		for (let i = 0; i < 20; i++) {
			this.entities.push(new Obstacle(
				100 + Math.random() * (this.width - 200),
				100 + Math.random() * (this.height - 200),
				30 + Math.random() * 50
			));
		}

		// Add survivors
		for (let i = 0; i < 20; i++) {
			this.entities.push(new Survivor(
				this.width / 2 + (Math.random() - 0.5) * 400,
				this.height / 2 + (Math.random() - 0.5) * 400
			));
		}

		// Add hunters
		for (let i = 0; i < 3; i++) {
			this.spawnHunter();
		}

		// Initial items
		for (let i = 0; i < 10; i++) {
			this.spawnItem();
		}

		// Initial Powerups
		for (let i = 0; i < 4; i++) {
			this.spawnPowerUp();
		}
	}

	spawnHunter(isBoss: boolean = false) {
		const hunter = new Hunter(
			Math.random() * this.width,
			Math.random() * this.height,
			(x, y, tx, ty) => {
				this.entities.push(new Projectile(x, y, tx, ty) as any);
			}
		);
		if (isBoss) {
			hunter.size = 30;
			hunter.speed = 3;
			hunter.shootCooldown = 800;
			hunter.color = "#fb7185";
			this.addMessage("⚠️ ¡EL CAZADOR ALFA HA DESPERTADO!");
		}
		this.entities.push(hunter);
	}

	addMessage(msg: string) {
		this.killFeed.unshift({ msg, time: Date.now() });
		if (this.killFeed.length > 5) this.killFeed.pop();
	}

	spawnItem() {
		const item = new Item(
			50 + Math.random() * (this.width - 100),
			50 + Math.random() * (this.height - 100)
		);
		// Check obstacle collision for spawning
		if (this.checkObstacleCollision(item.x, item.y, item.size)) {
			this.spawnItem(); // Retry
			return;
		}
		this.entities.push(item);
	}

	spawnPowerUp() {
		const pu = new PowerUp(
			50 + Math.random() * (this.width - 100),
			50 + Math.random() * (this.height - 100)
		);
		if (this.checkObstacleCollision(pu.x, pu.y, pu.size)) {
			this.spawnPowerUp();
			return;
		}
		this.entities.push(pu as any);
	}

	checkObstacleCollision(x: number, y: number, size: number): boolean {
		const obstacles = this.entities.filter(e => e.type === 'obstacle') as Obstacle[];
		for (const obs of obstacles) {
			const dist = Math.sqrt((x - obs.x) ** 2 + (y - obs.y) ** 2);
			if (dist < (size + obs.size)) return true;
		}
		return false;
	}

	createExplosion(x: number, y: number, color: string) {
		for (let i = 0; i < 8; i++) {
			this.particles.push({
				x, y, color, life: 1.0
			});
		}
	}

	update() {
		if (this.state !== 'playing') return;

		const now = Date.now();
		const hunters = this.entities.filter(e => e.type === 'hunter') as Hunter[];
		const survivors = this.entities.filter(e => e.type === 'survivor') as Survivor[];
		const items = this.entities.filter(e => e.type === 'item') as Item[];
		const projectiles = this.entities.filter(e => e.type === 'projectile') as Projectile[];
		const powerups = this.entities.filter(e => e.type === 'powerup') as PowerUp[];
		const obstacles = this.entities.filter(e => e.type === 'obstacle') as Obstacle[];

		// Spawn boss
		if (this.score >= 40 && !this.hasSpawnedBoss) {
			this.hasSpawnedBoss = true;
			this.spawnHunter(true);
		}

		// 1. Hunter catches Survivor
		for (const hunter of hunters) {
			for (let i = survivors.length - 1; i >= 0; i--) {
				const survivor = survivors[i];
				if (hunter.distanceTo(survivor) < (hunter.size + survivor.size)) {
					if (survivor.effects.shield > now) {
						survivor.effects.shield = 0;
						this.createExplosion(survivor.x, survivor.y, "#3b82f6");
						this.addMessage("🛡️ Escudo roto!");
					} else {
						const index = this.entities.indexOf(survivor);
						if (index > -1) {
							this.entities.splice(index, 1);
							this.screenShake = 15;
							this.createExplosion(survivor.x, survivor.y, "#f87171");
							this.addMessage("💀 Superviviente eliminado");
						}
					}
				}
			}
		}

		// 2. Projectile hits Survivor/Obstacle
		for (let i = projectiles.length - 1; i >= 0; i--) {
			const projectile = projectiles[i];
			let hit = false;

			// Hit Obstacle
			for (const obs of obstacles) {
				if (projectile.distanceTo(obs) < (projectile.size + obs.size)) {
					hit = true;
					break;
				}
			}

			// Hit Survivor
			if (!hit) {
				for (let j = survivors.length - 1; j >= 0; j--) {
					const survivor = survivors[j];
					if (projectile.distanceTo(survivor) < (projectile.size + survivor.size)) {
						if (survivor.effects.shield > now) {
							survivor.effects.shield = 0;
							this.createExplosion(survivor.x, survivor.y, "#3b82f6");
							this.addMessage("🛡️ Bloqueo de proyectil!");
						} else {
							const sIndex = this.entities.indexOf(survivor);
							if (sIndex > -1) {
								this.entities.splice(sIndex, 1);
								this.screenShake = 10;
								this.createExplosion(survivor.x, survivor.y, "#f87171");
								this.addMessage("🏹 Impacto crítico");
							}
						}
						hit = true;
						break;
					}
				}
			}

			if (hit || projectile.isExpired()) {
				const pIndex = this.entities.indexOf(projectile);
				if (pIndex > -1) this.entities.splice(pIndex, 1);
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
						this.createExplosion(item.x, item.y, "#facc15");
						if (Math.random() < 0.2) this.spawnPowerUp();
					}
				}
			}
		}

		// 4. PowerUp collection
		for (const survivor of survivors) {
			for (let i = powerups.length - 1; i >= 0; i--) {
				const pu = powerups[i];
				if (survivor.distanceTo(pu) < (survivor.size + pu.size)) {
					if (pu.type === 'shield') survivor.effects.shield = now + 5000;
					if (pu.type === 'speed') survivor.effects.speedBoost = now + 3000;
					const index = this.entities.indexOf(pu);
					if (index > -1) this.entities.splice(index, 1);
					this.createExplosion(pu.x, pu.y, "#60a5fa");
					this.addMessage(`✨ POWERUP: ${pu.type === 'shield' ? 'ESCUDO' : 'VELOCIDAD'}`);
				}
			}
		}

		// 5. Obstacle Repulsion
		for (const entity of this.entities) {
			if (entity.type === 'obstacle' || entity.type === 'projectile') continue;
			for (const obs of obstacles) {
				const dist = entity.distanceTo(obs);
				if (dist < (entity.size + obs.size)) {
					const angle = Math.atan2(entity.y - obs.y, entity.x - obs.x);
					entity.x = obs.x + Math.cos(angle) * (entity.size + obs.size + 1);
					entity.y = obs.y + Math.sin(angle) * (entity.size + obs.size + 1);
				}
			}
		}

		// 6. Camera follows average Survivor position
		if (survivors.length > 0) {
			let avgX = 0, avgY = 0;
			for (const s of survivors) {
				avgX += s.x; avgY += s.y;
			}
			avgX /= survivors.length; avgY /= survivors.length;

			// Smooth follow (lerp)
			this.camera.x += (avgX - this.viewWidth / 2 - this.camera.x) * 0.05;
			this.camera.y += (avgY - this.viewHeight / 2 - this.camera.y) * 0.05;

			// Clamp camera
			this.camera.x = Math.max(0, Math.min(this.camera.x, this.width - this.viewWidth));
			this.camera.y = Math.max(0, Math.min(this.camera.y, this.height - this.viewHeight));
		}

		// 7. Particle logic & Shake logic
		for (let i = this.particles.length - 1; i >= 0; i--) {
			const p = this.particles[i]; p.life -= 0.02;
			p.x += (Math.random() - 0.5) * 2; p.y += (Math.random() - 0.5) * 2;
			if (p.life <= 0) this.particles.splice(i, 1);
		}
		if (this.screenShake > 0) this.screenShake *= 0.9;

		// 8. Win/Loss Conditions
		if (survivors.length === 0) {
			this.state = 'huntersWin';
			this.onGameStateChange('huntersWin');
		} else if (this.score >= 100) { // Goal increased for Chaos Mode
			this.state = 'survivorsWin';
			this.onGameStateChange('survivorsWin');
		}

		// 9. Update all entities
		for (const entity of this.entities) {
			if (entity instanceof Hunter) {
				(entity as Hunter).update(this.entities, this.width, this.height, this.score);
			} else {
				entity.update(this.entities, this.width, this.height);
			}
		}
	}

	draw(ctx: CanvasRenderingContext2D) {
		ctx.save();
		if (this.screenShake > 0.5) {
			ctx.translate((Math.random() - 0.5) * this.screenShake, (Math.random() - 0.5) * this.screenShake);
		}

		ctx.clearRect(0, 0, this.viewWidth, this.viewHeight);

		// Draw grid background (offset by camera)
		ctx.strokeStyle = "#1e293b";
		ctx.lineWidth = 1;
		const startX = -(this.camera.x % 50);
		const startY = -(this.camera.y % 50);

		for (let i = startX; i < this.viewWidth; i += 50) {
			ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, this.viewHeight); ctx.stroke();
		}
		for (let i = startY; i < this.viewHeight; i += 50) {
			ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(this.viewWidth, i); ctx.stroke();
		}

		// Draw non-survivor entities (under fog)
		for (const entity of this.entities) {
			if (entity.type === 'survivor') continue;
			if (entity.x > this.camera.x - 100 && entity.x < this.camera.x + this.viewWidth + 100 &&
				entity.y > this.camera.y - 100 && entity.y < this.camera.y + this.viewHeight + 100) {
				entity.draw(ctx, this.camera.x, this.camera.y);
			}
		}

		// 10. Fog of War
		this.drawFog(ctx);

		// 11. Draw survivors (on top of fog holes)
		for (const entity of this.entities) {
			if (entity.type !== 'survivor') continue;
			if (entity.x > this.camera.x - 100 && entity.x < this.camera.x + this.viewWidth + 100 &&
				entity.y > this.camera.y - 100 && entity.y < this.camera.y + this.viewHeight + 100) {
				entity.draw(ctx, this.camera.x, this.camera.y);
			}
		}

		// Draw particles
		for (const p of this.particles) {
			ctx.globalAlpha = p.life;
			ctx.fillStyle = p.color;
			ctx.beginPath();
			ctx.arc(p.x - this.camera.x, p.y - this.camera.y, 3 * p.life, 0, Math.PI * 2);
			ctx.fill();
		}
		ctx.globalAlpha = 1.0;
		ctx.restore();

		// Draw Feed
		this.drawFeed(ctx);

		// Draw Minimap
		this.drawMinimap(ctx);
	}

	drawFog(ctx: CanvasRenderingContext2D) {
		ctx.save();
		ctx.fillStyle = "rgba(0, 0, 0, 0.4)"; // Global fog
		ctx.fillRect(0, 0, this.viewWidth, this.viewHeight);

		ctx.globalCompositeOperation = "destination-out";
		const survivors = this.entities.filter(e => e.type === 'survivor') as Survivor[];

		for (const s of survivors) {
			const radius = 200;
			const grad = ctx.createRadialGradient(
				s.x - this.camera.x, s.y - this.camera.y, 0,
				s.x - this.camera.x, s.y - this.camera.y, radius
			);
			grad.addColorStop(0, "rgba(255, 255, 255, 1.0)");
			grad.addColorStop(1, "rgba(255, 255, 255, 0.0)");
			ctx.fillStyle = grad;
			ctx.beginPath();
			ctx.arc(s.x - this.camera.x, s.y - this.camera.y, radius, 0, Math.PI * 2);
			ctx.fill();
		}
		ctx.restore();
	}

	drawFeed(ctx: CanvasRenderingContext2D) {
		ctx.font = "bold 12px 'Outfit', sans-serif";
		let y = 30;
		for (const item of this.killFeed) {
			const age = Date.now() - item.time;
			if (age > 4000) continue;
			ctx.globalAlpha = Math.max(0, 1 - age / 4000);
			ctx.fillStyle = "rgba(0,0,0,0.5)";
			const metrics = ctx.measureText(item.msg);
			ctx.fillRect(10, y - 15, metrics.width + 20, 20);
			ctx.fillStyle = "white";
			ctx.fillText(item.msg, 20, y);
			y += 25;
		}
		ctx.globalAlpha = 1.0;
	}

	drawMinimap(ctx: CanvasRenderingContext2D) {
		const mapWidth = 150;
		const mapHeight = 150;
		const mapX = this.viewWidth - mapWidth - 20;
		const mapY = 20;
		const scale = mapWidth / this.width;

		ctx.fillStyle = "rgba(15, 23, 42, 0.8)";
		ctx.strokeStyle = "rgba(59, 130, 246, 0.5)";
		ctx.lineWidth = 2;
		ctx.beginPath();
		ctx.roundRect(mapX, mapY, mapWidth, mapHeight, 8);
		ctx.fill();
		ctx.stroke();

		// Viewport rect
		ctx.strokeStyle = "rgba(255, 255, 255, 0.3)";
		ctx.strokeRect(mapX + this.camera.x * scale, mapY + this.camera.y * scale, this.viewWidth * scale, this.viewHeight * scale);

		// Entities
		for (const entity of this.entities) {
			if (entity.type === 'survivor') ctx.fillStyle = "#4ade80";
			else if (entity.type === 'hunter') ctx.fillStyle = "#f87171";
			else if (entity.type === 'item') ctx.fillStyle = "#facc15";
			else if (entity.type === 'obstacle') ctx.fillStyle = "#475569";
			else continue;

			ctx.beginPath();
			ctx.arc(mapX + entity.x * scale, mapY + entity.y * scale, 2, 0, Math.PI * 2);
			ctx.fill();
		}
	}
}
