import type { Favorite } from '../config';

// Curated quick-links for Hollow Knight: the player character plus bosses (fandom Bosses category),
// each linked to its arena fight FSM. Found via the en_titles title-card keys + index game-object
// search, hand-verified. Extend/fix entries here.
export const hkFavorites: Favorite[] = [
	// the player character: links to the level4 scene tree (all Knight FSMs)
	{ name: 'Knight', file: 'level4' },
	{
		name: 'Absolute Radiance',
		file: 'level459',
		game_object: 'Boss Control/Absolute Radiance',
		fsm: 'Control'
	},
	{ name: 'Broken Vessel', file: 'level343', game_object: 'Infected Knight', fsm: 'IK Control' },
	{
		name: 'Brooding Mawlek',
		file: 'level45',
		game_object: '_Enemies/Mawlek Body',
		fsm: 'Mawlek Control'
	},
	{ name: 'Brothers Oro & Mato', file: 'level454', game_object: 'Brothers', fsm: 'Combo Control' },
	{
		name: 'Crystal Guardian',
		file: 'level261',
		game_object: 'Mega Zombie Beam Miner (1)',
		fsm: 'Beam Miner'
	},
	{ name: 'Dung Defender', file: 'level355', game_object: 'Dung Defender', fsm: 'Dung Defender' },
	{ name: 'Elder Hu', file: 'level194', game_object: 'Warrior/Ghost Warrior Hu', fsm: 'Attacking' },
	{
		name: 'Enraged Guardian',
		file: 'level271',
		game_object: 'Battle Scene/Zombie Beam Miner Rematch',
		fsm: 'Beam Miner'
	},
	{
		name: 'Failed Champion',
		file: 'level395',
		game_object: 'False Knight Dream',
		fsm: 'FalseyControl'
	},
	{
		name: 'False Knight',
		file: 'level432',
		game_object: 'Battle Scene/False Knight New',
		fsm: 'FalseyControl'
	},
	{ name: 'God Tamer', file: 'level441', game_object: 'Entry Object', fsm: 'Control' },
	{
		name: 'Great Nailsage Sly',
		file: 'level460',
		game_object: 'Battle Scene/Sly Boss',
		fsm: 'Control'
	},
	{ name: 'Grey Prince Zote', file: 'level399', game_object: 'Grey Prince', fsm: 'Control' },
	{
		name: 'Gruz Mother',
		file: 'sharedassets32.assets',
		game_object: 'Giant Fly Col',
		fsm: 'Big Fly Control'
	},
	{
		name: 'Hive Knight',
		file: 'level389',
		game_object: 'Battle Scene/Hive Knight',
		fsm: 'Control'
	},
	{
		name: 'Hollow Knight',
		file: 'level409',
		game_object: 'Boss Control/Hollow Knight Boss',
		fsm: 'Control'
	},
	{ name: 'Hornet Protector', file: 'level133', game_object: 'Hornet Boss 1', fsm: 'Control' },
	{ name: 'Hornet Sentinel', file: 'level325', game_object: 'Hornet Boss 2', fsm: 'Control' },
	{ name: 'Lost Kin', file: 'level397', game_object: 'Lost Kin', fsm: 'IK Control' },
	{
		name: 'Mantis Lords',
		file: 'level180',
		game_object: 'Mantis Battle/Battle Main/Mantis Lord',
		fsm: 'Mantis Lord'
	},
	{
		name: 'Markoth',
		file: 'level314',
		game_object: 'Warrior/Ghost Warrior Markoth',
		fsm: 'Attacking'
	},
	{ name: 'Marmu', file: 'level221', game_object: 'Warrior/Ghost Warrior Marmu', fsm: 'Control' },
	{
		name: 'Massive Moss Charger',
		file: 'level156',
		game_object: 'Mega Moss Charger',
		fsm: 'Mossy Control'
	},
	{
		name: 'Nightmare King Grimm',
		file: 'level393',
		game_object: 'Grimm Control/Nightmare Grimm Boss',
		fsm: 'Control'
	},
	{
		name: 'No Eyes',
		file: 'level161',
		game_object: 'Warrior/Ghost Warrior No Eyes',
		fsm: 'Attacking'
	},
	{ name: 'Nosk', file: 'level290', game_object: 'Mimic Spider', fsm: 'Mimic Spider' },
	{
		name: 'Paintmaster Sheo',
		file: 'level457',
		game_object: 'Battle Scene/Sheo Boss',
		fsm: 'nailmaster_sheo'
	},
	{ name: 'Pure Vessel', file: 'level447', game_object: 'Battle Scene/HK Prime', fsm: 'Control' },
	{ name: 'Radiance', file: 'level407', game_object: 'Boss Control/Radiance', fsm: 'Control' },
	{
		name: 'Sisters of Battle',
		file: 'level486',
		game_object: 'Mantis Battle/Battle Main/Mantis Lord',
		fsm: 'Mantis Lord'
	},
	{ name: 'Soul Master', file: 'level102', game_object: 'Mage Lord', fsm: 'Mage Lord' },
	{ name: 'Soul Tyrant', file: 'level396', game_object: 'Dream Mage Lord', fsm: 'Mage Lord' },
	{ name: 'Soul Warrior', file: 'level109', game_object: 'Mage Knight', fsm: 'Mage Knight' },
	{
		name: 'The Collector',
		file: 'level126',
		game_object: 'Battle Scene/Jar Collector',
		fsm: 'Control'
	},
	{
		name: 'Traitor Lord',
		file: 'level209',
		game_object: 'Battle Scene/Wave 3/Mantis Traitor Lord',
		fsm: 'Mantis'
	},
	{ name: 'Troupe Master Grimm', file: 'level392', game_object: 'Grimm Boss', fsm: 'Control' },
	{ name: 'Uumuu', file: 'level229', game_object: 'Mega Jellyfish', fsm: 'Mega Jellyfish' },
	{ name: 'Vengefly King', file: 'level467', game_object: 'Giant Buzzer Col', fsm: 'Big Buzzer' },
	{
		name: 'Watcher Knights',
		file: 'level115',
		game_object: 'Battle Control/Black Knight 1',
		fsm: 'Black Knight'
	},
	{ name: 'White Defender', file: 'level398', game_object: 'White Defender', fsm: 'Dung Defender' },
	{
		name: 'Winged Nosk',
		file: 'level487',
		game_object: 'Battle Scene/Hornet Nosk',
		fsm: 'Hornet Nosk'
	},
	{ name: 'Xero', file: 'level238', game_object: 'Warrior/Ghost Warrior Xero', fsm: 'Attacking' },
	{
		name: 'Zote the Mighty',
		file: 'level481',
		game_object: 'Battle Control/First Zote/Zote Boss',
		fsm: 'Control'
	}
];

// TODO: fandom Bosses (Hollow Knight) still unmapped — no arena fight FSM in the index:
//   - Gorb: absent (only the Godhome statue exists; no "Ghost Warrior Gorb")
//   - Oblobbles: only a Corpse / colosseum-wave / statue FSM, no clean boss controller
//   - Flukemarm: only the Godhome statue (the boss's own FSM isn't in the index)
// (Hunter is an NPC, not a fight; "Sister Splinter" is a Silksong boss miscategorised on the wiki.)
