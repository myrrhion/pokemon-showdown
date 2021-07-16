export const Moves: {[moveid: string]: ModdedMoveData} = {
	gnaw: {
		accuracy: 100,
		basePower: 20,
		category: "Physical",
		name: "Gnaw",
		pp: 25,
		priority: 0,
		flags: {bite: 1, contact: 1, protect: 1, mirror: 1, heal: 1},
		drain: [1, 2],
		secondary: null,
		target: "normal",
		type: "Ghost",
	},
	highjumpkick: {
		inherit: true,
		desc: "If this attack misses the target, the user 1HP of damage.",
		shortDesc: "User takes 1 HP damage if miss.",
		onMoveFail(target, source, move) {
			this.damage(1, source);
		},
	},
};
