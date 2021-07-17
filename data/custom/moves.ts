export const Moves: {[moveid: string]: ModdedMoveData} = {

	highjumpkick: {
		inherit: true,
		desc: "If this attack misses the target, the user 1HP of damage.",
		shortDesc: "User takes 1 HP damage if miss.",
		onMoveFail(target, source, move) {
			this.damage(1, source);
		},
	},
};
