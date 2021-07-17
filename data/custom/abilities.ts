export const Abilities: {[k: string]: ModdedAbilityData} = {
	infectious: {
		name: "Infectious Bite",
		desc: "This is a long description",
		onDamagingHit(damage, target, source, move) {
			const sourceAbility = source.getAbility();
			if (sourceAbility.isPermanent || sourceAbility.id === 'infectious' || sourceAbility.id === 'infected') {
				return;
			}
			if (this.checkMoveMakesContact(move, source, target, !source.isAlly(target))) {
				const oldAbility = source.setAbility('mummy', target);
				if (oldAbility) {
					this.add('-activate', target, 'ability: Infectious Bite', this.dex.abilities.get(oldAbility).name, '[of] ' + source);
				}
			}
		},
	},
	infected: {
		name: "Infected",
		desc: "",
		onDamagingHit(damage, target, source, move) {
			const sourceAbility = source.getAbility();
			if (sourceAbility.isPermanent || sourceAbility.id === 'infectious') {
				return;
			}
			if (this.checkMoveMakesContact(move, source, target, !source.isAlly(target))) {
				const oldAbility = source.setAbility('mummy', target);
				if (oldAbility) {
					this.add('-activate', target, 'ability: Infectious Bite', this.dex.abilities.get(oldAbility).name, '[of] ' + source);
				}
			}
		},
	},
};
