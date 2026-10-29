import type { Favorite } from '../config';

// Curated quick-links for Silksong: the player character plus journal bosses (required=1), each
// linked to its arena fight FSM. Found via the en titles title-card keys + index game-object search,
// hand-verified. Extend/fix entries here.
export const ssFavorites: Favorite[] = [
	// the player character: links to the whole Hero_Hornet bundle tree (all her FSMs)
	{ name: 'Hornet', scene: 'heroloading_assets_all.bundle' },
	{
		name: 'Bell Beast',
		scene: 'Bone_05_boss',
		game_object: 'Boss Scene/Bone Beast',
		fsm: 'Control'
	},
	{
		name: 'Bell Eater',
		scene: 'Bellway_Centipede_Arena',
		game_object: 'Boss Scene/Centipede Control',
		fsm: 'Control'
	},
	{
		name: 'Broodmother',
		scene: 'Slab_16b',
		game_object:
			'Broodmother Scene Control/Broodmother Scene/Battle Scene Broodmother/Wave 4/Slab Fly Broodmother',
		fsm: 'Control'
	},
	{
		name: 'Clover Dancers',
		scene: 'Clover_10',
		game_object: 'Boss Scene/Dancer Control/Dancer A',
		fsm: 'Control'
	},
	{
		name: 'Cogwork Dancers',
		scene: 'Cog_Dancers_boss',
		game_object: 'Dancer Control',
		fsm: 'Control'
	},
	{
		name: 'Crawfather',
		scene: 'Room_CrowCourt_02',
		game_object: 'Battle Scene/Wave 6/Crawfather',
		fsm: 'Control'
	},
	{
		name: 'Crust King Khann',
		scene: 'Memory_Coral_Tower',
		game_object: 'Boss Scene/Coral King',
		fsm: 'Control'
	},
	{
		name: 'Disgraced Chef Lugoli',
		scene: 'Dust_Chef',
		game_object: 'Battle Parent/Battle Scene/Wave 2/Roachkeeper Chef (1)',
		fsm: 'Control'
	},
	{
		name: 'Father of the Flame',
		scene: 'Belltown_08',
		game_object: 'Boss Scene/Wisp Pyre Effigy',
		fsm: 'Summon Control'
	},
	{
		name: 'First Sinner',
		scene: 'Slab_10b',
		game_object: 'Boss Scene/First Weaver',
		fsm: 'Control'
	},
	{
		name: 'Forebrothers Signis & Gron',
		scene: 'Dock_09',
		game_object: 'Boss Scene/Dock Guard Thrower',
		fsm: 'Control'
	},
	{
		name: 'Fourth Chorus',
		scene: 'Bone_East_08_boss_golem',
		game_object: 'Boss Scene/song_golem',
		fsm: 'Control'
	},
	{
		name: 'Grand Mother Silk',
		scene: 'Cradle_03',
		game_object: 'Boss Scene/Silk Boss',
		fsm: 'Control'
	},
	{
		name: 'Groal the Great',
		scene: 'Shadow_18',
		game_object: 'Battle Scene/Wave 6 - Boss/Swamp Shaman',
		fsm: 'Control'
	},
	{
		name: 'Gurr the Outcast',
		scene: 'Bone_East_18b',
		game_object: 'Boss Scene/Bone Hunter Trapper',
		fsm: 'Control'
	},
	{
		name: 'Huge Flea',
		scene: 'Arborium_08',
		game_object: 'Giant Flea Scene/Giant Flea',
		fsm: 'Control'
	},
	{
		name: 'Lace',
		scene: 'Bone_East_12',
		game_object: 'Boss Scene/Lace Boss1',
		fsm: 'Control'
	},
	{
		name: 'Last Judge',
		scene: 'Coral_Judge_Arena',
		game_object: 'Boss Scene/Last Judge',
		fsm: 'Control'
	},
	{
		name: 'Lost Garmond',
		scene: 'Coral_33',
		game_object:
			'Black Thread States/Black Thread World/Garmond Scenes/Garmond Black Threaded Scene/Garmond Black Threaded Fighter',
		fsm: 'Control'
	},
	{
		name: 'Lost Lace',
		scene: 'Abyss_Cocoon',
		game_object: 'Boss Control/Lost Lace Boss',
		fsm: 'Control'
	},
	{
		name: 'Moorwing',
		scene: 'Greymoor_05_boss',
		game_object: 'Vampire Gnat Boss Scene/Vampire Gnat',
		fsm: 'Control'
	},
	{
		name: 'Moss Mother',
		scene: 'Tut_03',
		game_object: 'Black Thread States/Normal World/Battle Scene/Wave 1/Mossbone Mother',
		fsm: 'Control'
	},
	{
		name: 'Nyleth',
		scene: 'Shellwood_11b_Memory',
		game_object: 'Boss Scene/Flower Queen Boss',
		fsm: 'Control'
	},
	{
		name: 'Palestag',
		scene: 'Clover_19',
		game_object: 'Boss Scene/Cloverstag White Boss',
		fsm: 'Control'
	},
	{
		name: 'Phantom',
		scene: 'Organ_01',
		game_object: 'Boss Scene/Phantom',
		fsm: 'Control'
	},
	{
		name: 'Pinstress',
		scene: 'Peak_07',
		game_object: 'Pinstress Control/Pinstress Scene/Pinstress Boss',
		fsm: 'Control'
	},
	{
		name: 'Plasmified Zango',
		scene: 'Crawl_10',
		game_object: 'Area_States/Infected/Blue Assistant',
		fsm: 'Control'
	},
	{
		name: 'Savage Beastfly',
		scene: 'Bone_East_08_boss_beastfly',
		game_object: 'Boss Scene Beastfly/Beastfly States/Active/Bone Flyer Giant',
		fsm: 'Control'
	},
	{
		name: 'Second Sentinel',
		scene: 'Hang_17b',
		game_object: 'Boss Scene - To Additive Load/Song Knight',
		fsm: 'Control'
	},
	{
		name: 'Shakra',
		scene: 'Hang_04_boss',
		game_object: 'Battle Scene/Shakra Fighter',
		fsm: 'Control'
	},
	{
		name: 'Shrine Guardian Seth',
		scene: 'Shellwood_22',
		game_object: 'Boss Scene/Seth',
		fsm: 'Control'
	},
	{
		name: 'Sister Splinter',
		scene: 'Shellwood_18',
		game_object: 'Boss Scene Parent/Boss Scene/Splinter Queen',
		fsm: 'Control'
	},
	{
		name: 'Skarrsinger Karmelita',
		scene: 'Memory_Ant_Queen',
		game_object: 'Boss Scene/Hunter Queen Boss',
		fsm: 'Control'
	},
	{
		name: 'Skull Tyrant',
		scene: 'Bonetown_boss',
		game_object: 'Boss Scene/Skull King',
		fsm: 'Behaviour'
	},
	{
		name: 'Summoned Saviour',
		scene: 'Bone_Steel_Servant',
		game_object: 'Steel Servant Scene/Battle Scene/Wave 1/Abyss Mass',
		fsm: 'Control'
	},
	{
		name: 'The Unravelled',
		scene: 'Ward_02_boss',
		game_object: 'Boss Scene/Conductor Boss',
		fsm: 'Control'
	},
	{
		name: 'Tormented Trobbio',
		scene: 'Library_13',
		game_object: 'Grand Stage Scene/Boss Scene TormentedTrobbio/Tormented Trobbio',
		fsm: 'Control'
	},
	{
		name: 'Trobbio',
		scene: 'Library_13',
		game_object: 'Grand Stage Scene/Boss Scene Trobbio/Trobbio',
		fsm: 'Control'
	},
	{
		name: 'Voltvyrm',
		scene: 'Coral_29',
		game_object: 'Boss Scene/Zap Core Enemy',
		fsm: 'Control'
	},
	{
		name: 'Watcher at the Edge',
		scene: 'Coral_39',
		game_object: 'Coral Warrior Grey',
		fsm: 'Control'
	},
	{
		name: 'Widow',
		scene: 'Belltown_Shrine',
		game_object: 'Black Thread States Thread Only Variant/Normal World/Boss Scene/Spinner Boss',
		fsm: 'Control'
	}
];

// TODO: fandom Bosses (Silksong) still unmapped — no clear arena FSM found in the index yet:
//   - Craggler, Sharpe, Skarrgard: no matching game object found
//   - Great Conchflies / Raging Conchfly: two candidates, assignment unclear —
//       coral_27 | Battle Scene/Wave 1/Coral Conch Driller Giant Solo | Control
//       coral_11 | …/Boss Scene/Coral Conch Driller Giant Mourn | Control
