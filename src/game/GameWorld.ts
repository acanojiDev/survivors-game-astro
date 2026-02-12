import { Entity } from "./Entity";
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
	lightningFlash: number = 0;
	lastHunterSpawnScore: number = 0;
	timeScale: number = 1.0;
	hyperTimeLeft: number = 0;
	lightningBolts: { segments: { x: number, y: number }[], alpha: number }[] = [];
	evolutionFlash: number = 0;
	lastEvolutionScore: number = 0;
	activeNovas: { x: number, y: number, radius: number, alpha: number }[] = [];
	isUpgradePending: boolean = false;
	availableUpgrades: any[] = [];
	lastLevelUpScore: number = 0;
	isClassSelectionPending: boolean = true;

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
		this.isClassSelectionPending = true;
		this.onScoreUpdate(0);
		this.onGameStateChange('playing');
		this.particles = [];
		this.hasSpawnedBoss = false;
		this.lastHunterSpawnScore = 0;
		this.lastEvolutionScore = 0;
		this.lightningFlash = 0;
		this.evolutionFlash = 0;
		this.screenShake = 0;
		this.camera = { x: this.width / 2 - this.viewWidth / 2, y: this.height / 2 - this.viewHeight / 2 };

		// Initial survivors
		for (let i = 0; i < 20; i++) {
			this.entities.push(new Survivor(
				this.width / 2 + (Math.random() - 0.5) * 400,
				this.height / 2 + (Math.random() - 0.5) * 400
			));
		}

		// Initial hunters
		for (let i = 0; i < 8; i++) {
			this.spawnHunter();
		}

		// Initial obstacles
		for (let i = 0; i < 20; i++) {
			const size = 30 + Math.random() * 50;
			this.entities.push(new Obstacle(
				100 + Math.random() * (this.width - 200),
				100 + Math.random() * (this.height - 200),
				size,
				size
			));
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

	resize(width: number, height: number) {
		this.viewWidth = width;
		this.viewHeight = height;
	}

	spawnHunter(isBoss: boolean = false, isPhantom: boolean = false) {
		const hunter = new Hunter(
			Math.random() * this.width,
			Math.random() * this.height,
			(x, y, tx, ty) => {
				this.entities.push(new Projectile(x, y, tx, ty) as any);
			},
			isBoss,
			isPhantom
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

	createExplosion(x: number, y: number, color: string, count: number = 10) {
		for (let i = 0; i < count; i++) {
			this.particles.push({
				x, y,
				color,
				life: 1.0,
				vx: (Math.random() - 0.5) * 10,
				vy: (Math.random() - 0.5) * 10
			} as any);
		}
		// Add some "smoke" or larger shards
		for (let i = 0; i < 3; i++) {
			this.particles.push({
				x, y,
				color: "#94a3b8",
				life: 1.5,
				vx: (Math.random() - 0.5) * 5,
				vy: (Math.random() - 0.5) * 5,
				size: 4
			} as any);
		}
	}

	update(): void {
		if (this.state !== 'playing' || this.isUpgradePending || this.isClassSelectionPending) return;

		const now = Date.now();
		const tScale = this.hyperTimeLeft > now ? 0.3 : 1.0;
		this.timeScale = tScale;
		const hunters = this.entities.filter(e => e.type === 'hunter') as Hunter[];
		const survivors = this.entities.filter(e => e.type === 'survivor') as Survivor[];

		// Level Up Check
		const milestones = [10, 30, 60];
		for (const m of milestones) {
			if (this.score >= m && this.lastLevelUpScore < m) {
				this.lastLevelUpScore = m;
				this.isUpgradePending = true;
				this.generateUpgrades();
				return;
			}
		}

		const items = this.entities.filter(e => e.type === 'item') as Item[];
		const projectiles = this.entities.filter(e => e.type === 'projectile') as Projectile[];
		const powerups = this.entities.filter(e => e.type === 'powerup') as PowerUp[];
		const obstacles = this.entities.filter(e => e.type === 'obstacle') as Obstacle[];

		// Evolution Flash Logic
		if (this.score >= this.lastEvolutionScore + 30 && this.score > 0) {
			this.lastEvolutionScore = Math.floor(this.score / 30) * 30;
			this.evolutionFlash = 1.0;
			this.addMessage("🧬¡EVOLUCIÓN DETECTADA!");
			this.screenShake = 15;
		}
		if (this.evolutionFlash > 0) this.evolutionFlash -= 0.02;

		// Spawn boss
		if (this.score >= 40 && !this.hasSpawnedBoss) {
			this.hasSpawnedBoss = true;
			this.spawnHunter(true);
		}

		// Dynamic Scaling Hunters (NOW MUCH AGGRESSIVE)
		if (this.score >= this.lastHunterSpawnScore + 10) {
			this.lastHunterSpawnScore = this.score;
			const amount = 2 + Math.floor(this.score / 20); // More hunters as score increases
			for (let i = 0; i < amount; i++) {
				const isPhantom = this.score >= 50 && Math.random() < 0.3;
				this.spawnHunter(false, isPhantom);
			}
			this.addMessage(`� REFUERZOS DETECTADOS (+${amount})`);
		}

		// MONSTER HORDE EVENT (Random chance)
		if (Math.random() < 0.001) { // Rare but intense
			for (let i = 0; i < 15; i++) {
				this.spawnHunter();
			}
			this.addMessage("🔥 ¡HORDA DE MONSTRUOS INCOMING!");
			this.screenShake = 20;
		}

		// Thunderstorm Logic
		if (Math.random() < 0.002 && this.lightningFlash <= 0) {
			this.lightningFlash = 1.0;
			this.addMessage("⚡ TORMENTA ELÉCTRICA");
			this.screenShake = 25;
			this.generateLightning();
		}
		if (this.lightningFlash > 0) this.lightningFlash -= 0.04;
		for (let i = this.lightningBolts.length - 1; i >= 0; i--) {
			this.lightningBolts[i].alpha -= 0.05;
			if (this.lightningBolts[i].alpha <= 0) this.lightningBolts.splice(i, 1);
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
					(obs as Obstacle).health -= 5;
					this.createExplosion(projectile.x, projectile.y, obs.color, 3);
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
			if (survivor.novaEnergy >= 100) {
				this.activeNovas.push({ x: survivor.x, y: survivor.y, radius: 0, alpha: 1.0 });
				survivor.novaEnergy = 0;
				this.screenShake = 30;
				this.addMessage("💥 ¡CHAOS NOVA LIBERADA!");
			}
			for (let i = powerups.length - 1; i >= 0; i--) {
				const pu = powerups[i];
				if (survivor.distanceTo(pu) < (survivor.size + pu.size)) {
					if (pu.type === 'shield') survivor.effects.shield = now + 5000;
					if (pu.type === 'speed') survivor.effects.speedBoost = now + 3000;
					if (pu.type === 'hyper') this.hyperTimeLeft = now + 4000;

					const index = this.entities.indexOf(pu);
					if (index > -1) this.entities.splice(index, 1);
					this.createExplosion(pu.x, pu.y, pu.type === 'hyper' ? "#f161ff" : "#60a5fa");
					this.addMessage(`✨ POWERUP: ${pu.type.toUpperCase()}`);
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
			const p = this.particles[i]; p.life -= (0.02 * this.timeScale);

			if ((p as any).vx !== undefined) {
				p.x += (p as any).vx * this.timeScale;
				p.y += (p as any).vy * this.timeScale;
				(p as any).vx *= 0.98; (p as any).vy *= 0.98; // Friction
			} else {
				p.x += (Math.random() - 0.5) * 5 * this.timeScale;
				p.y += (Math.random() - 0.5) * 5 * this.timeScale;
			}

			if (p.life <= 0) this.particles.splice(i, 1);
		}

		// 7.2 Drone Laser Damage
		for (const s of survivors) {
			for (const drone of s.drones) {
				if (drone.laserTarget && Math.abs(drone.laserTarget.time - now - 150) < 20) {
					// Apply damage to hunter at laserTarget
					const targetX = drone.laserTarget.x;
					const targetY = drone.laserTarget.y;
					for (let i = hunters.length - 1; i >= 0; i--) {
						const h = hunters[i];
						const dist = Math.sqrt((h.x - targetX) ** 2 + (h.y - targetY) ** 2);
						if (dist < h.size) {
							this.createExplosion(h.x, h.y, h.isPhantom ? "#8b5cf6" : "#f87171");
							const idx = this.entities.indexOf(h);
							if (idx > -1) this.entities.splice(idx, 1);
							break;
						}
					}
				}
			}
		}

		// 7.5 Nova Logic
		for (let i = this.activeNovas.length - 1; i >= 0; i--) {
			const n = this.activeNovas[i];
			n.radius += 15 * this.timeScale;
			n.alpha -= 0.02;

			// Kill projectiles and push hunters
			for (const e of this.entities) {
				const dist = Math.sqrt((e.x - n.x) ** 2 + (e.y - n.y) ** 2);
				if (dist < n.radius && dist > n.radius - 50) {
					if (e.type === 'projectile') {
						const idx = this.entities.indexOf(e);
						if (idx > -1) this.entities.splice(idx, 1);
					}
					if (e.type === 'hunter') {
						const angle = Math.atan2(e.y - n.y, e.x - n.x);
						e.x += Math.cos(angle) * 10;
						e.y += Math.sin(angle) * 10;
					}
					if (e.type === 'obstacle') {
						(e as Obstacle).health -= 2;
					}
				}
			}

			if (n.alpha <= 0) this.activeNovas.splice(i, 1);
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
			if (entity.type === 'hunter') {
				(entity as Hunter).update(this.entities, this.width, this.height, this.score);
				// Manual backtrack movement since update doesn't take timeScale
				if (this.timeScale < 1) {
					// We could pass timeScale to update, but let's just slow them externally or trust the tick
					// Actually, let's just multiply their speed in update soon.
					// For now, they updated at full speed. Correcting:
					entity.x -= (entity.x - (entity as any).prevX || entity.x) * (1 - this.timeScale);
					entity.y -= (entity.y - (entity as any).prevY || entity.y) * (1 - this.timeScale);
				}
			} else if (entity.type === 'survivor') {
				(entity as Survivor).update(this.entities, this.width, this.height, this.score);
			} else if (entity.type === 'projectile') {
				// Projectiles are fast, let's slow them too
				entity.update(this.entities, this.width, this.height);
				// Rough compensation
				if (this.timeScale < 1) {
					// We'll just let them be for now or fix Projectile.ts
				}
			} else {
				entity.update(this.entities, this.width, this.height);
			}
		}
	}

	draw(ctx: CanvasRenderingContext2D) {
		const survivors = this.entities.filter(e => e.type === 'survivor') as Survivor[];
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

		// 11. Draw Lightning Flash & Glitch
		if (this.lightningFlash > 0) {
			// Lightning Bolts
			for (const bolt of this.lightningBolts) {
				this.drawLightningBolt(ctx, bolt);
			}

			// Screen Flash with Glow
			ctx.save();
			ctx.shadowBlur = 40;
			ctx.shadowColor = "white";
			ctx.fillStyle = `rgba(255, 255, 255, ${this.lightningFlash * 0.7})`;
			ctx.fillRect(0, 0, this.viewWidth, this.viewHeight);
			ctx.restore();

			// Chromatic Glitch Effect
			if (Math.random() < this.lightningFlash * 0.8) {
				const offset = this.lightningFlash * 15;
				ctx.save();
				ctx.globalCompositeOperation = "screen";

				// Red shift
				ctx.translate(offset, 0);
				ctx.fillStyle = "rgba(255, 0, 0, 0.2)";
				ctx.fillRect(0, 0, this.viewWidth, this.viewHeight);

				// Blue shift
				ctx.translate(-offset * 2, 0);
				ctx.fillStyle = "rgba(0, 255, 255, 0.2)";
				ctx.fillRect(0, 0, this.viewWidth, this.viewHeight);

				ctx.restore();

				// Inversion glitch
				if (Math.random() < 0.2) {
					ctx.save();
					ctx.globalCompositeOperation = "difference";
					ctx.fillStyle = "white";
					ctx.fillRect(0, 0, this.viewWidth, this.viewHeight);
					ctx.restore();
				}
			}
		}

		// 11.5 Draw Hyper Screen Tint
		if (this.hyperTimeLeft > Date.now()) {
			ctx.fillStyle = "rgba(147, 51, 234, 0.15)";
			ctx.fillRect(0, 0, this.viewWidth, this.viewHeight);
		}

		// 11.7 Draw Evolution Bloom
		if (this.evolutionFlash > 0) {
			ctx.save();
			ctx.globalCompositeOperation = "screen";
			const grad = ctx.createRadialGradient(
				this.viewWidth / 2, this.viewHeight / 2, 0,
				this.viewWidth / 2, this.viewHeight / 2, this.viewWidth / 1.5
			);
			grad.addColorStop(0, `rgba(252, 211, 77, ${this.evolutionFlash * 0.8})`);
			grad.addColorStop(1, "rgba(252, 211, 77, 0)");
			ctx.fillStyle = grad;
			ctx.fillRect(0, 0, this.viewWidth, this.viewHeight);
			ctx.restore();
		}

		// 11.8 Venom Overlay (Near Acid)
		const nearbyAcid = survivors.some(s =>
			this.entities.filter(e => e.type === 'obstacle').some(o =>
				Math.sqrt((s.x - o.x) ** 2 + (s.y - o.y) ** 2) < 150
			)
		);
		if (nearbyAcid) {
			ctx.save();
			const pulse = Math.sin(Date.now() / 200) * 0.2 + 0.3;
			const grad = ctx.createRadialGradient(this.viewWidth / 2, this.viewHeight / 2, this.viewHeight / 3, this.viewWidth / 2, this.viewHeight / 2, this.viewHeight);
			grad.addColorStop(0, "rgba(34, 197, 94, 0)");
			grad.addColorStop(1, `rgba(34, 197, 94, ${pulse})`);
			ctx.fillStyle = grad;
			ctx.fillRect(0, 0, this.viewWidth, this.viewHeight);
			ctx.restore();
		}

		// 11.9 Draw Novas
		for (const n of this.activeNovas) {
			ctx.save();
			ctx.strokeStyle = `rgba(241, 97, 255, ${n.alpha})`;
			ctx.lineWidth = 10;
			ctx.shadowBlur = 30;
			ctx.shadowColor = "#f161ff";
			ctx.beginPath();
			ctx.arc(n.x - this.camera.x, n.y - this.camera.y, n.radius, 0, Math.PI * 2);
			ctx.stroke();
			ctx.restore();
		}

		// 12. Draw survivors (on top of fog holes)
		for (const entity of this.entities) {
			if (entity.type !== 'survivor') continue;
			if (entity.x > this.camera.x - 100 && entity.x < this.camera.x + this.viewWidth + 100 &&
				entity.y > this.camera.y - 100 && entity.y < this.camera.y + this.viewHeight + 100) {
				entity.draw(ctx, this.camera.x, this.camera.y);
			}
		}

		// 11. Draw particles
		for (const p of this.particles) {
			ctx.fillStyle = p.color;
			ctx.globalAlpha = p.life;
			ctx.beginPath();
			const size = (p as any).size || 2;
			ctx.arc(p.x - this.camera.x, p.y - this.camera.y, size, 0, Math.PI * 2);
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
		// Fog is revealed during lightning - much more subtle now
		const fogAlpha = 0.15 - (this.lightningFlash * 0.15);
		ctx.fillStyle = `rgba(0, 0, 0, ${fogAlpha})`;
		ctx.fillRect(0, 0, this.viewWidth, this.viewHeight);

		ctx.globalCompositeOperation = "destination-out";
		const survivors = this.entities.filter(e => e.type === 'survivor') as Survivor[];

		for (const s of survivors) {
			const radius = 300;
			const grad = ctx.createRadialGradient(
				s.x - this.camera.x, s.y - this.camera.y, 0,
				s.x - this.camera.x, s.y - this.camera.y, radius
			);
			grad.addColorStop(0, "rgba(255, 255, 255, 1.0)");
			grad.addColorStop(0.5, "rgba(255, 255, 255, 0.5)");
			grad.addColorStop(1, "rgba(255, 255, 255, 0)");
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

	generateLightning() {
		const boltCount = 1 + Math.floor(Math.random() * 2);
		for (let b = 0; b < boltCount; b++) {
			this.createBolt(Math.random() * this.viewWidth, 0, Math.random() * this.viewWidth, this.viewHeight, 1.0, 0);
		}
	}

	createBolt(x1: number, y1: number, x2: number, y2: number, alpha: number, depth: number) {
		if (depth > 2) return; // Prevent stack overflow

		const segments: { x: number, y: number }[] = [];
		let curX = x1;
		let curY = y1;
		segments.push({ x: curX, y: curY });

		const steps = 12;
		const dx = (x2 - x1) / steps;
		const dy = (y2 - y1) / steps;

		for (let i = 0; i < steps; i++) {
			curX += dx + (Math.random() - 0.5) * 80;
			curY += dy + (Math.random() - 0.5) * 20;
			segments.push({ x: curX, y: curY });

			// Branching
			if (Math.random() < 0.15 && i < steps - 2 && depth < 2) {
				this.createBolt(curX, curY, curX + (Math.random() - 0.5) * 200, curY + 200, alpha * 0.6, depth + 1);
			}
		}
		this.lightningBolts.push({ segments, alpha });
	}

	drawLightningBolt(ctx: CanvasRenderingContext2D, bolt: { segments: { x: number, y: number }[], alpha: number }) {
		ctx.save();
		ctx.strokeStyle = "white";
		ctx.lineWidth = 2 + Math.random() * 2;
		ctx.shadowBlur = 20;
		ctx.shadowColor = "#93c5fd";
		ctx.globalAlpha = bolt.alpha;
		ctx.beginPath();
		ctx.moveTo(bolt.segments[0].x, bolt.segments[0].y);
		for (let i = 1; i < bolt.segments.length; i++) {
			ctx.lineTo(bolt.segments[i].x, bolt.segments[i].y);
		}
		ctx.stroke();

		// Inner glow
		ctx.lineWidth = 1;
		ctx.shadowBlur = 5;
		ctx.stroke();

		ctx.restore();
	}

	generateUpgrades() {
		const pool = [
			{ id: 'laser', name: 'Laser Frenzy', desc: 'Drones fire 50% faster', icon: '⚡' },
			{ id: 'armor', name: 'Armor Plating', desc: 'Permanent 30% Damage Reduction', icon: '🛡️' },
			{ id: 'nova', name: 'Nova Resonance', desc: 'Chaos Nova radius +50%', icon: '💥' },
			{ id: 'hyper', name: 'Hyper Engine', desc: 'Movement speed +20%', icon: '🚀' }
		];
		// Randomize 3
		this.availableUpgrades = pool.sort(() => Math.random() - 0.5).slice(0, 3);
	}

	applyUpgrade(id: string) {
		const survivors = this.entities.filter(e => e.type === 'survivor') as Survivor[];
		for (const s of survivors) {
			if (id === 'laser') {
				for (const d of s.drones) d.shootCooldown *= 0.5;
			}
			if (id === 'armor') {
				// Implement in Entity damage logic later, for now just a buff
				s.size += 5;
			}
			if (id === 'nova') {
				// This would be checked in GameWorld.ts Nova logic
			}
			if (id === 'hyper') {
				s.speed *= 1.2;
			}
		}
		this.isUpgradePending = false;
		this.addMessage("💪 MEJORA LEGENDARIA APLICADA");
	}

	applyHeroClass(type: 'tank' | 'speedster' | 'mage') {
		const survivors = this.entities.filter(e => e.type === 'survivor') as Survivor[];
		for (const s of survivors) {
			s.setClass(type);
		}
		this.isClassSelectionPending = false;
		this.addMessage(`🎭 CLASE SELECCIONADA: ${type.toUpperCase()}`);
	}
}
