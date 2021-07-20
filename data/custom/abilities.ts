export const Abilities: {[k: string]: ModdedAbilityData} = {
	infectiousbite: {
		name: "Infectious Bite",
		desc: "This is a long description",
		shortDesc: "Infects Pokemon that attack it.",
		onDamagingHit(damage, target, source, move) {
			const sourceAbility = source.getAbility();
			if (sourceAbility.isPermanent || sourceAbility.id === 'infectiousbite' || sourceAbility.id === 'infected') {
				return;
			}
			if (this.checkMoveMakesContact(move, source, target, !source.isAlly(target))) {
				const oldAbility = source.setAbility('infected', target);
				if (oldAbility) {
					this.add('-activate', target, 'ability: Infectious Bite', this.dex.abilities.get(oldAbility).name, '[of] ' + source);
				}
			}
		},
	},
	infected: {
		name: "Infected",
		desc: "",
		shortDesc: "Infects Pokemon that attack it, also, is effected.",
		onDamagingHit(damage, target, source, move) {
			const sourceAbility = source.getAbility();
			if (sourceAbility.isPermanent || sourceAbility.id === 'infectiousbite') {
				return;
			}
			if (this.checkMoveMakesContact(move, source, target, !source.isAlly(target))) {
				const oldAbility = source.setAbility('mummy', target);
				if (oldAbility) {
					this.add('-activate', target, 'ability: Infected', this.dex.abilities.get(oldAbility).name, '[of] ' + source);
				}
			}
		},
	},
};
