export const Items: {[itemid: string]: ItemData} = {
	brassknuckles: {
		name: "Brass Knuckles",
		spritenum: 261,
		isCustom: true,
		fling: {
			basePower: 40,
		},
		onBasePower(basePower, attacker, defender, move) {
			if (move.flags['punch']) {
				this.debug('Brass Knuckle boost');
				return this.chainModify([4915, 4096]);
			}
		},
		num: 456,
		gen: 8,
	},
};
