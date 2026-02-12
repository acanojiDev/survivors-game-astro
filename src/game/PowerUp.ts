import { Entity } from "./Entity";

export type PowerType = 'shield' | 'speed' | 'invisible';

export class PowerUp extends Entity {
	type: PowerType;

	constructor(x: number, y: number) {
		const types: PowerType[] = ['shield', 'speed'];
		const type = types[Math.floor(Math.random() * types.length)];
		super(x, y, "#60a5fa", "/assets/powerup.svg", 0, 'powerup');
		this.type = type;
		this.size = 12;
	}

	update(_entities: Entity[], _canvasWidth: number, _canvasHeight: number): void {
		// Floating animation
		this.y += Math.sin(Date.now() / 500) * 0.2;
	}
}
