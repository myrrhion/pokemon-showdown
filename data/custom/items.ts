export const Items: {[itemid: string]: ItemData} = {
	brassknuckles: {
		name: "Brass Knuckles",
		spritenum: 261,
		desc: "Increases punch",
		shortDesc: "Increases punch damage by 1.1x power.",
		isCustom: true,
		fling: {
			basePower: 40,
		},
		onBasePower(basePower, attacker, defender, move) {
			if (move.flags['punch']) {
				this.debug('Brass Knuckle boost');
				return this.chainModify(1.1);
			}
		},
		num: 456,
		gen: 8,
	},
};
