import { Entity } from "./Entity";
import { Survivor } from "./Survivor";

export class Hunter extends Entity {
	lastShotTime: number = 0;
	shootCooldown: number = 2000; // 2 seconds
	onShoot: (x: number, y: number, tx: number, ty: number) => void;
	isPhantom: boolean = false;
	isBoss: boolean = false;
	isEnraged: boolean = false;

	constructor(x: number, y: number, onShoot: (x: number, y: number, tx: number, ty: number) => void, isBoss: boolean = false, isPhantom: boolean = false) {
		super(x, y, isBoss ? "#fb7185" : (isPhantom ? "#8b5cf6" : "#f87171"), "/assets/hunter.svg", isBoss ? 3 : (isPhantom ? 4 : 2), 'hunter');
		this.onShoot = onShoot;
		this.isBoss = isBoss;
		this.size = isBoss ? 30 : (isPhantom ? 15 : 20);
		this.shootCooldown = isBoss ? 800 : (isPhantom ? 1200 : 2000);
		this.isPhantom = isPhantom;
		if (isPhantom) this.alpha = 0.6;
	}

	update(entities: Entity[], canvasWidth: number, canvasHeight: number, score: number = 0): void {
		const now = Date.now();
		if (this.isPhantom) this.effects.speedBoost = now + 1000; // Constant trails for phantoms

		// Enraged Phase (Boss only)
		if (this.isBoss && score > 80 && !this.isEnraged) {
			this.isEnraged = true;
			this.speed *= 2; // Double speed
			this.shootCooldown /= 2; // Halve cooldown
			this.color = "#ef4444"; // Bright red
			this.auraSize = this.size * 1.5; // Add fire-aura effect
			this.auraColor = "#ef4444";
		}

		const survivors = entities.filter(e => e.type === 'survivor') as Survivor[];

		// Berserk logic: Speed increases based on survivors' score
		const currentSpeed = this.speed + (score * 0.1);

		// Find nearest survivor
		let nearestSurvivor: Survivor | null = null;
		let minDistance = Infinity;

		for (const survivor of survivors) {
			const dist = this.distanceTo(survivor);
			if (dist < minDistance) {
				minDistance = dist;
				nearestSurvivor = survivor;
			}
		}

		if (nearestSurvivor) {
			this.moveTowards(nearestSurvivor.x, nearestSurvivor.y, currentSpeed);

			// Shooting logic (Triple Shot every 3rd shot)
			const now = Date.now();
			if (minDistance < 300 && now - this.lastShotTime > this.shootCooldown) {
				// Triple Shot
				const angle = Math.atan2(nearestSurvivor.y - this.y, nearestSurvivor.x - this.x);
				this.onShoot(this.x, this.y, this.x + Math.cos(angle) * 100, this.y + Math.sin(angle) * 100);
				this.onShoot(this.x, this.y, this.x + Math.cos(angle - 0.2) * 100, this.y + Math.sin(angle - 0.2) * 100);
				this.onShoot(this.x, this.y, this.x + Math.cos(angle + 0.2) * 100, this.y + Math.sin(angle + 0.2) * 100);

				this.lastShotTime = now;
			}
		}

		this.checkBounds(canvasWidth, canvasHeight);
	}

	protected moveTowards(targetX: number, targetY: number, speed: number): void {
		const angle = Math.atan2(targetY - this.y, targetX - this.x);
		this.x += Math.cos(angle) * speed;
		this.y += Math.sin(angle) * speed;
	}
}
