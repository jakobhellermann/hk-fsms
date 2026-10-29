import type { Favorite } from '../config';

// Curated quick-links for Hollow Knight: the player character plus bosses (fandom Bosses category),
// each linked to its arena fight FSM. Found via the en_titles title-card keys + index game-object
// search, hand-verified. Extend/fix entries here.
export const hkFavorites: Favorite[] = [
	// the player character: links to the Knight_Pickup scene tree (all Knight FSMs)
	{ name: 'Knight', scene: 'Knight_Pickup' },
	{
		name: 'Absolute Radiance',
		scene: 'GG_Radiance',
		game_object: 'Boss Control/Absolute Radiance',
		fsm: 'Control'
	},
	{ name: 'Broken Vessel', scene: 'Abyss_19', game_object: 'Infected Knight', fsm: 'IK Control' },
	{
		name: 'Brooding Mawlek',
		scene: 'Crossroads_09',
		game_object: '_Enemies/Mawlek Body',
		fsm: 'Mawlek Control'
	},
	{
		name: 'Brothers Oro & Mato',
		scene: 'GG_Nailmasters',
		game_object: 'Brothers',
		fsm: 'Combo Control'
	},
	{
		name: 'Crystal Guardian',
		scene: 'Mines_18_boss',
		game_object: 'Mega Zombie Beam Miner (1)',
		fsm: 'Beam Miner',
		overrides: { '1.2.2.1': { scene: 'Mines_18' } }
	},
	{
		name: 'Dung Defender',
		scene: 'Waterways_05_boss',
		game_object: 'Dung Defender',
		fsm: 'Dung Defender',
		overrides: { '1.2.2.1': { scene: 'Waterways_05' } }
	},
	{
		name: 'Elder Hu',
		scene: 'Fungus2_32',
		game_object: 'Warrior/Ghost Warrior Hu',
		fsm: 'Attacking'
	},
	{
		name: 'Enraged Guardian',
		scene: 'Mines_32',
		game_object: 'Battle Scene/Zombie Beam Miner Rematch',
		fsm: 'Beam Miner'
	},
	{
		name: 'Failed Champion',
		scene: 'Dream_01_False_Knight',
		game_object: 'False Knight Dream',
		fsm: 'FalseyControl'
	},
	{
		name: 'False Knight',
		scene: 'GG_False_Knight',
		game_object: 'Battle Scene/False Knight New',
		fsm: 'FalseyControl',
		overrides: { '1.2.2.1': { scene: 'Crossroads_10', game_object: 'False Knight New' } }
	},
	{
		name: 'Flukemarm',
		scene: 'Waterways_12_boss',
		game_object: 'Fluke Mother',
		fsm: 'Fluke Mother',
		overrides: { '1.2.2.1': { scene: 'Waterways_12' } }
	},
	{
		name: 'Galien',
		scene: 'Deepnest_40',
		game_object: 'Warrior/Ghost Warrior Galien',
		fsm: 'Movement'
	},
	{ name: 'God Tamer', scene: 'GG_God_Tamer', game_object: 'Entry Object', fsm: 'Control' },
	// Gorb's internal codename is "Slug" (arena scene Cliffs_02_boss).
	{
		name: 'Gorb',
		scene: 'Cliffs_02_boss',
		game_object: 'Warrior/Ghost Warrior Slug',
		fsm: 'Attacking',
		overrides: { '1.2.2.1': { scene: 'Cliffs_02' } }
	},
	{
		name: 'Great Nailsage Sly',
		scene: 'GG_Sly',
		game_object: 'Battle Scene/Sly Boss',
		fsm: 'Control'
	},
	{
		name: 'Grey Prince Zote',
		scene: 'Dream_Mighty_Zote',
		game_object: 'Grey Prince',
		fsm: 'Control'
	},
	{
		name: 'Gruz Mother',
		scene: 'sharedassets32.assets',
		game_object: 'Giant Fly Col',
		fsm: 'Big Fly Control',
		overrides: { '1.2.2.1': { scene: 'sharedassets33.assets' } }
	},
	{
		name: 'Hive Knight',
		scene: 'Hive_05',
		game_object: 'Battle Scene/Hive Knight',
		fsm: 'Control'
	},
	{
		name: 'Hollow Knight',
		scene: 'Room_Final_Boss_Core',
		game_object: 'Boss Control/Hollow Knight Boss',
		fsm: 'Control'
	},
	{
		name: 'Hornet Protector',
		scene: 'Fungus1_04_boss',
		game_object: 'Hornet Boss 1',
		fsm: 'Control',
		overrides: { '1.2.2.1': { scene: 'Fungus1_04' } }
	},
	{
		name: 'Hornet Sentinel',
		scene: 'Deepnest_East_Hornet_boss',
		game_object: 'Hornet Boss 2',
		fsm: 'Control',
		overrides: { '1.2.2.1': { scene: 'Deepnest_East_Hornet' } }
	},
	{
		name: 'Lost Kin',
		scene: 'Dream_03_Infected_Knight',
		game_object: 'Lost Kin',
		fsm: 'IK Control'
	},
	{
		name: 'Mantis Lords',
		scene: 'Fungus2_15_boss',
		game_object: 'Mantis Battle/Battle Main/Mantis Lord',
		fsm: 'Mantis Lord',
		overrides: { '1.2.2.1': { scene: 'Fungus2_15' } }
	},
	{
		name: 'Markoth',
		scene: 'Deepnest_East_10',
		game_object: 'Warrior/Ghost Warrior Markoth',
		fsm: 'Attacking'
	},
	{
		name: 'Marmu',
		scene: 'Fungus3_40_boss',
		game_object: 'Warrior/Ghost Warrior Marmu',
		fsm: 'Control',
		overrides: { '1.2.2.1': { scene: 'Fungus3_40' } }
	},
	{
		name: 'Massive Moss Charger',
		scene: 'Fungus1_29',
		game_object: 'Mega Moss Charger',
		fsm: 'Mossy Control'
	},
	{
		name: 'Nightmare King Grimm',
		scene: 'Grimm_Nightmare',
		game_object: 'Grimm Control/Nightmare Grimm Boss',
		fsm: 'Control'
	},
	{
		name: 'No Eyes',
		scene: 'Fungus1_35',
		game_object: 'Warrior/Ghost Warrior No Eyes',
		fsm: 'Attacking'
	},
	{ name: 'Nosk', scene: 'Deepnest_32', game_object: 'Mimic Spider', fsm: 'Mimic Spider' },
	{
		name: 'Oblobbles',
		scene: 'Room_Colosseum_Silver',
		game_object: 'Colosseum Manager/Waves/Wave 30 Obble/Mega Fat Bee',
		fsm: 'Fatty Fly Attack'
	},
	{
		name: 'Paintmaster Sheo',
		scene: 'GG_Painter',
		game_object: 'Battle Scene/Sheo Boss',
		fsm: 'nailmaster_sheo'
	},
	{
		name: 'Pure Vessel',
		scene: 'GG_Hollow_Knight',
		game_object: 'Battle Scene/HK Prime',
		fsm: 'Control'
	},
	{
		name: 'Radiance',
		scene: 'Dream_Final_Boss',
		game_object: 'Boss Control/Radiance',
		fsm: 'Control'
	},
	{
		name: 'Sisters of Battle',
		scene: 'GG_Mantis_Lords_V',
		game_object: 'Mantis Battle/Battle Main/Mantis Lord',
		fsm: 'Mantis Lord'
	},
	{
		name: 'Soul Master',
		scene: 'Ruins1_24_boss',
		game_object: 'Mage Lord',
		fsm: 'Mage Lord',
		overrides: { '1.2.2.1': { scene: 'Ruins1_24' } }
	},
	{
		name: 'Soul Tyrant',
		scene: 'Dream_02_Mage_Lord',
		game_object: 'Dream Mage Lord',
		fsm: 'Mage Lord'
	},
	{
		name: 'Soul Warrior',
		scene: 'Ruins1_31b',
		game_object: 'Mage Knight',
		fsm: 'Mage Knight',
		overrides: { '1.2.2.1': { scene: 'Ruins1_31' } }
	},
	{
		name: 'The Collector',
		scene: 'Ruins2_11_boss',
		game_object: 'Battle Scene/Jar Collector',
		fsm: 'Control',
		overrides: { '1.2.2.1': { scene: 'Ruins2_11' } }
	},
	{
		name: 'Traitor Lord',
		scene: 'Fungus3_23_boss',
		game_object: 'Battle Scene/Wave 3/Mantis Traitor Lord',
		fsm: 'Mantis',
		overrides: { '1.2.2.1': { scene: 'Fungus3_23' } }
	},
	{
		name: 'Troupe Master Grimm',
		scene: 'Grimm_Main_Tent_boss',
		game_object: 'Grimm Boss',
		fsm: 'Control',
		overrides: { '1.2.2.1': { scene: 'Grimm_Main_Tent', game_object: 'Grimm Holder/Grimm Boss' } }
	},
	{
		name: 'Uumuu',
		scene: 'Fungus3_archive_02_boss',
		game_object: 'Mega Jellyfish',
		fsm: 'Mega Jellyfish',
		overrides: { '1.2.2.1': { scene: 'Fungus3_archive_02' } }
	},
	{
		name: 'Vengefly King',
		scene: 'GG_Vengefly',
		game_object: 'Giant Buzzer Col',
		fsm: 'Big Buzzer'
	},
	{
		name: 'Watcher Knights',
		scene: 'Ruins2_03_boss',
		game_object: 'Battle Control/Black Knight 1',
		fsm: 'Black Knight',
		overrides: { '1.2.2.1': { scene: 'Ruins2_03' } }
	},
	{
		name: 'White Defender',
		scene: 'Dream_04_White_Defender',
		game_object: 'White Defender',
		fsm: 'Dung Defender'
	},
	{
		name: 'Winged Nosk',
		scene: 'GG_Nosk_Hornet',
		game_object: 'Battle Scene/Hornet Nosk',
		fsm: 'Hornet Nosk'
	},
	{
		name: 'Xero',
		scene: 'RestingGrounds_02_boss',
		game_object: 'Warrior/Ghost Warrior Xero',
		fsm: 'Attacking',
		overrides: { '1.2.2.1': { scene: 'RestingGrounds_02' } }
	},
	{
		name: 'Zote the Mighty',
		scene: 'GG_Mighty_Zote',
		game_object: 'Battle Control/First Zote/Zote Boss',
		fsm: 'Control'
	}
];

// (Hunter is an NPC, not a fight; "Sister Splinter" is a Silksong boss miscategorised on the wiki.)
