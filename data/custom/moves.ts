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
		onPrepareHit(target, source) {
			this.add('-anim', source, 'Crunch', target);
		},
	},
	wistfulthinking: {
		accuracy: 100,
		basePower: 0,
		category: "Status",
		desc: "Burns the target and switches out. The next Pokemon on the user's side heals 1/16 of their maximum HP per turn until they switch out.",
		shortDesc: "Burn foe; switch out. Heals replacement.",
		name: "Wistful Thinking",
		pp: 10,
		priority: 0,
		onTryMove() {
			this.attrLastMove('[still]');
		},
		onPrepareHit(target, source) {
			this.add('-anim', source, 'Will-O-Wisp', target);
			this.add('-anim', source, 'Parting Shot', target);
		},
		onHit(target, source) {
			target.trySetStatus('brn', source);
		},
		self: {
			sideCondition: 'givewistfulthinking',
		},
		condition: {
			onStart(pokemon) {
				this.add('-start', pokemon, 'move: Wistful Thinking');
			},
			onResidualOrder: 5,
			onResidualSubOrder: 5,
			onResidual(pokemon) {
				this.heal(pokemon.baseMaxhp / 16);
			},
		},
		flags: {protect: 1, reflectable: 1},
		selfSwitch: true,
		secondary: null,
		target: "normal",
		type: "Ghost",
	},
};
