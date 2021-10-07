export const Scripts: ModdedBattleScriptsData = {
	gen: 8,
	actions: {
		inherit: true,
		hitStepTryImmunity(targets: Pokemon[], pokemon: Pokemon, move: ActiveMove) {
			const hitResults = [];
			for (const [i, target] of targets.entries()) {
				if (this.battle.gen >= 6 && move.flags['powder'] && target !== pokemon && !this.dex.getImmunity('powder', target)) {
					this.battle.debug('natural powder immunity');
					this.battle.add('-immune', target);
					hitResults[i] = false;
				} else if (!this.battle.singleEvent('TryImmunity', move, {}, target, pokemon, move)) {
					this.battle.add('-immune', target);
					hitResults[i] = false;
				} else if (this.battle.gen >= 7 && move.pranksterBoosted &&
					(pokemon.hasAbility('prankster') ||
						this.battle.field.isWeather(["bloodmoon", "strongbloodmoon"])) &&
					!targets[i].isAlly(pokemon) && !this.dex.getImmunity('prankster', target)) {
					this.battle.debug('natural prankster immunity');
					if (!target.illusion) this.battle.hint("Since gen 7, Dark is immune to Prankster moves.");
					this.battle.add('-immune', target);
					hitResults[i] = false;
				} else {
					hitResults[i] = true;
				}
			}
			return hitResults;
		},
	},
};
