import { Entity } from "./Entity";
import { Hunter } from "./Hunter";
import { Projectile } from "./Projectile";
import { Drone } from "./Drone";
import { Item } from "./Item";
import { PowerUp } from "./PowerUp";
import { Obstacle } from "./Obstacle";

export class Survivor extends Entity {
	constructor(x: number, y: number) {
		super(x, y, "#4ade80", "/assets/survivor.svg", 1.5, 'survivor');
	}

	dashCooldown: number = 2000;
	lastDash: number = 0;
	rank: number = 0;
	novaEnergy: number = 0;
	drones: Drone[] = [];
	classType: 'tank' | 'speedster' | 'mage' = 'speedster';
	novaChargeRate: number = 0.1;

	setClass(type: 'tank' | 'speedster' | 'mage') {
		this.classType = type;
		if (type === 'tank') {
			this.size = 25;
			this.speed = 1.2;
			this.color = "#94a3b8"; // Steel
			this.auraColor = "#3b82f6";
			this.effects.shield = Date.now() + 9999999;
		} else if (type === 'speedster') {
			this.size = 12;
			this.speed = 2.0;
			this.color = "#facc15"; // Neon Yellow
			this.auraColor = "#facc15";
			this.dashCooldown = 1000;
		} else if (type === 'mage') {
			this.size = 18;
			this.speed = 1.5;
			this.color = "#c084fc"; // Purple
			this.auraColor = "#f161ff";
			this.novaChargeRate = 0.2;
			this.drones.push(new Drone(this, 0));
		}
	}

	update(entities: Entity[], canvasWidth: number, canvasHeight: number, score: number = 0): void {
		// Evolution Logic
		const newRank = Math.floor(score / 30);
		if (newRank > this.rank) {
			this.rank = newRank;
			this.auraColor = this.rank === 1 ? "#34d399" : this.rank === 2 ? "#60a5fa" : "#f161ff";
			this.auraSize = 10 + this.rank * 5;
			this.speed = 1.5 + this.rank * 0.2;

			// Spawn Drones on specific ranks
			if (this.rank === 1) this.drones.push(new Drone(this, 0));
			if (this.rank === 3) this.drones.push(new Drone(this, Math.PI));
		}

		if (this.rank >= 2) this.novaEnergy += this.novaChargeRate; // Passive charge at high rank

		for (const drone of this.drones) {
			drone.update(entities);
		}

		const now = Date.now();
		const hunters = entities.filter(e => e.type === 'hunter') as Hunter[];
		const projectiles = entities.filter(e => e.type === 'projectile') as Projectile[];
		const items = entities.filter(e => e.type === 'item') as Item[];
		const powerUps = entities.filter(e => e.type === 'powerup') as PowerUp[];
		const obstacles = entities.filter(e => e.type === 'obstacle') as Obstacle[];

		// 1. Dash logic
		if (now - this.lastDash > this.dashCooldown) {
			const threat = [...hunters, ...projectiles].find(h => this.distanceTo(h) < 70);
			if (threat) {
				const angle = Math.atan2(this.y - threat.y, this.x - threat.x);
				this.x += Math.cos(angle) * 70;
				this.y += Math.sin(angle) * 70;
				this.lastDash = now;
				this.effects.speedBoost = now + 500;
			}
		}

		// Handle effects
		const currentSpeed = this.effects.speedBoost > now ? this.speed * 2.5 : this.speed;

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
	draw(ctx: CanvasRenderingContext2D, camX: number, camY: number): void {
		const drawX = this.x - camX;
		const drawY = this.y - camY;
		const now = Date.now();

		ctx.save();

		// 1. Base Class Skin
		if (this.classType === 'tank') {
			// Brutalist Hexagon Armor
			ctx.fillStyle = "#475569";
			ctx.strokeStyle = "#94a3b8";
			ctx.lineWidth = 3;
			ctx.beginPath();
			for (let i = 0; i < 6; i++) {
				const angle = (i * Math.PI * 2) / 6;
				const px = drawX + Math.cos(angle) * this.size;
				const py = drawY + Math.sin(angle) * this.size;
				if (i === 0) ctx.moveTo(px, py);
				else ctx.lineTo(px, py);
			}
			ctx.closePath();
			ctx.fill();
			ctx.stroke();

			// Inner reactor glow
			ctx.fillStyle = "#3b82f6";
			ctx.beginPath();
			ctx.arc(drawX, drawY, this.size * 0.4, 0, Math.PI * 2);
			ctx.fill();
		} else if (this.classType === 'speedster') {
			// Aerodynamic Wedge
			ctx.fillStyle = "#fbbf24";
			ctx.beginPath();
			ctx.moveTo(drawX + this.size * 1.5, drawY);
			ctx.lineTo(drawX - this.size, drawY - this.size);
			ctx.lineTo(drawX - this.size * 0.5, drawY);
			ctx.lineTo(drawX - this.size, drawY + this.size);
			ctx.closePath();
			ctx.fill();

			// Energy trails (Speedster specific)
			if (this.effects.speedBoost > now) {
				ctx.strokeStyle = "rgba(250, 204, 21, 0.5)";
				ctx.lineWidth = 2;
				ctx.beginPath();
				ctx.moveTo(drawX - this.size, drawY);
				ctx.lineTo(drawX - this.size * 3, drawY);
				ctx.stroke();
			}
		} else if (this.classType === 'mage') {
			// Ethereal Pentagram / Floating Rune
			ctx.strokeStyle = "#a855f7";
			ctx.lineWidth = 2;
			ctx.save();
			ctx.translate(drawX, drawY);
			ctx.rotate(now / 500);
			ctx.beginPath();
			for (let i = 0; i < 5; i++) {
				const angle = (i * Math.PI * 2) / 5;
				ctx.lineTo(Math.cos(angle) * this.size, Math.sin(angle) * this.size);
			}
			ctx.closePath();
			ctx.stroke();

			// Floating core
			ctx.fillStyle = `rgba(168, 85, 247, ${0.5 + Math.sin(now / 200) * 0.3})`;
			ctx.beginPath();
			ctx.arc(0, 0, this.size * 0.5, 0, Math.PI * 2);
			ctx.fill();
			ctx.restore();
		}

		// 2. Rank Indicators (Floating Orbs)
		if (this.rank > 0) {
			for (let i = 0; i < this.rank; i++) {
				const orbitAngle = (now / 1000) + (i * Math.PI * 2 / this.rank);
				const ox = drawX + Math.cos(orbitAngle) * (this.size + 15);
				const oy = drawY + Math.sin(orbitAngle) * (this.size + 15);
				ctx.fillStyle = this.auraColor || "#ffffff";
				ctx.beginPath();
				ctx.arc(ox, oy, 3, 0, Math.PI * 2);
				ctx.fill();
			}
		}

		// 3. Fallback to parent draw for common effects (shield, etc)
		// But we need to avoid redrawing the base circle/image
		// So we manually call the effect parts of Entity.draw
		this.drawEffects(ctx, drawX, drawY);

		ctx.restore();
	}

	private drawEffects(ctx: CanvasRenderingContext2D, x: number, y: number) {
		const now = Date.now();
		if (this.effects.shield > now) {
			ctx.strokeStyle = "#3b82f6";
			ctx.lineWidth = 2;
			ctx.beginPath();
			ctx.arc(x, y, this.size + 5, 0, Math.PI * 2);
			ctx.stroke();
		}

		if (this.auraSize > 0) {
			ctx.shadowBlur = this.auraSize;
			ctx.shadowColor = this.auraColor || "white";
		}
	}
}
