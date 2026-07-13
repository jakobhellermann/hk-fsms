import type { Favorite } from '../config';

// Curated quick-links for Silksong: the player character plus journal bosses (required=1), each
// linked to its arena fight FSM. Found via the en titles title-card keys + index game-object search,
// hand-verified. Extend/fix entries here.
export const ssFavorites: Favorite[] = [
	// the player character: links to the whole Hero_Hornet bundle tree (all her FSMs)
	{ name: 'Hornet', file: 'heroloading_assets_all.bundle' },
	{
		name: 'Bell Beast',
		file: 'scenes_scenes_scenes/bone_05_boss.bundle',
		game_object: 'Boss Scene/Bone Beast',
		fsm: 'Control'
	},
	{
		name: 'Bell Eater',
		file: 'scenes_scenes_scenes/bellway_centipede_arena.bundle',
		game_object: 'Boss Scene/Centipede Control',
		fsm: 'Control'
	},
	{
		name: 'Broodmother',
		file: 'scenes_scenes_scenes/slab_16b.bundle',
		game_object:
			'Broodmother Scene Control/Broodmother Scene/Battle Scene Broodmother/Wave 4/Slab Fly Broodmother',
		fsm: 'Control'
	},
	{
		name: 'Clover Dancers',
		file: 'scenes_scenes_scenes/clover_10.bundle',
		game_object: 'Boss Scene/Dancer Control/Dancer A',
		fsm: 'Control'
	},
	{
		name: 'Cogwork Dancers',
		file: 'scenes_scenes_scenes/cog_dancers_boss.bundle',
		game_object: 'Dancer Control',
		fsm: 'Control'
	},
	{
		name: 'Crawfather',
		file: 'scenes_scenes_scenes/room_crowcourt_02.bundle',
		game_object: 'Battle Scene/Wave 6/Crawfather',
		fsm: 'Control'
	},
	{
		name: 'Crust King Khann',
		file: 'scenes_scenes_scenes/memory_coral_tower.bundle',
		game_object: 'Boss Scene/Coral King',
		fsm: 'Control'
	},
	{
		name: 'Disgraced Chef Lugoli',
		file: 'scenes_scenes_scenes/dust_chef.bundle',
		game_object: 'Battle Parent/Battle Scene/Wave 2/Roachkeeper Chef (1)',
		fsm: 'Control'
	},
	{
		name: 'Father of the Flame',
		file: 'scenes_scenes_scenes/belltown_08.bundle',
		game_object: 'Boss Scene/Wisp Pyre Effigy',
		fsm: 'Summon Control'
	},
	{
		name: 'First Sinner',
		file: 'scenes_scenes_scenes/slab_10b.bundle',
		game_object: 'Boss Scene/First Weaver',
		fsm: 'Control'
	},
	{
		name: 'Forebrothers Signis & Gron',
		file: 'scenes_scenes_scenes/dock_09.bundle',
		game_object: 'Boss Scene/Dock Guard Thrower',
		fsm: 'Control'
	},
	{
		name: 'Fourth Chorus',
		file: 'scenes_scenes_scenes/bone_east_08_boss_golem.bundle',
		game_object: 'Boss Scene/song_golem',
		fsm: 'Control'
	},
	{
		name: 'Grand Mother Silk',
		file: 'scenes_scenes_scenes/cradle_03.bundle',
		game_object: 'Boss Scene/Silk Boss',
		fsm: 'Control'
	},
	{
		name: 'Groal the Great',
		file: 'scenes_scenes_scenes/shadow_18.bundle',
		game_object: 'Battle Scene/Wave 6 - Boss/Swamp Shaman',
		fsm: 'Control'
	},
	{
		name: 'Gurr the Outcast',
		file: 'scenes_scenes_scenes/bone_east_18b.bundle',
		game_object: 'Boss Scene/Bone Hunter Trapper',
		fsm: 'Control'
	},
	{
		name: 'Huge Flea',
		file: 'scenes_scenes_scenes/arborium_08.bundle',
		game_object: 'Giant Flea Scene/Giant Flea',
		fsm: 'Control'
	},
	{
		name: 'Lace',
		file: 'scenes_scenes_scenes/bone_east_12.bundle',
		game_object: 'Boss Scene/Lace Boss1',
		fsm: 'Control'
	},
	{
		name: 'Last Judge',
		file: 'scenes_scenes_scenes/coral_judge_arena.bundle',
		game_object: 'Boss Scene/Last Judge',
		fsm: 'Control'
	},
	{
		name: 'Lost Garmond',
		file: 'scenes_scenes_scenes/coral_33.bundle',
		game_object:
			'Black Thread States/Black Thread World/Garmond Scenes/Garmond Black Threaded Scene/Garmond Black Threaded Fighter',
		fsm: 'Control'
	},
	{
		name: 'Lost Lace',
		file: 'scenes_scenes_scenes/abyss_cocoon.bundle',
		game_object: 'Boss Control/Lost Lace Boss',
		fsm: 'Control'
	},
	{
		name: 'Moorwing',
		file: 'scenes_scenes_scenes/greymoor_05_boss.bundle',
		game_object: 'Vampire Gnat Boss Scene/Vampire Gnat',
		fsm: 'Control'
	},
	{
		name: 'Moss Mother',
		file: 'scenes_scenes_scenes/tut_03.bundle',
		game_object: 'Black Thread States/Normal World/Battle Scene/Wave 1/Mossbone Mother',
		fsm: 'Control'
	},
	{
		name: 'Nyleth',
		file: 'scenes_scenes_scenes/shellwood_11b_memory.bundle',
		game_object: 'Boss Scene/Flower Queen Boss',
		fsm: 'Control'
	},
	{
		name: 'Palestag',
		file: 'scenes_scenes_scenes/clover_19.bundle',
		game_object: 'Boss Scene/Cloverstag White Boss',
		fsm: 'Control'
	},
	{
		name: 'Phantom',
		file: 'scenes_scenes_scenes/organ_01.bundle',
		game_object: 'Boss Scene/Phantom',
		fsm: 'Control'
	},
	{
		name: 'Pinstress',
		file: 'scenes_scenes_scenes/peak_07.bundle',
		game_object: 'Pinstress Control/Pinstress Scene/Pinstress Boss',
		fsm: 'Control'
	},
	{
		name: 'Plasmified Zango',
		file: 'scenes_scenes_scenes/crawl_10.bundle',
		game_object: 'Area_States/Infected/Blue Assistant',
		fsm: 'Control'
	},
	{
		name: 'Savage Beastfly',
		file: 'scenes_scenes_scenes/bone_east_08_boss_beastfly.bundle',
		game_object: 'Boss Scene Beastfly/Beastfly States/Active/Bone Flyer Giant',
		fsm: 'Control'
	},
	{
		name: 'Second Sentinel',
		file: 'scenes_scenes_scenes/hang_17b.bundle',
		game_object: 'Boss Scene - To Additive Load/Song Knight',
		fsm: 'Control'
	},
	{
		name: 'Shakra',
		file: 'scenes_scenes_scenes/hang_04_boss.bundle',
		game_object: 'Battle Scene/Shakra Fighter',
		fsm: 'Control'
	},
	{
		name: 'Shrine Guardian Seth',
		file: 'scenes_scenes_scenes/shellwood_22.bundle',
		game_object: 'Boss Scene/Seth',
		fsm: 'Control'
	},
	{
		name: 'Sister Splinter',
		file: 'scenes_scenes_scenes/shellwood_18.bundle',
		game_object: 'Boss Scene Parent/Boss Scene/Splinter Queen',
		fsm: 'Control'
	},
	{
		name: 'Skarrsinger Karmelita',
		file: 'scenes_scenes_scenes/memory_ant_queen.bundle',
		game_object: 'Boss Scene/Hunter Queen Boss',
		fsm: 'Control'
	},
	{
		name: 'Skull Tyrant',
		file: 'scenes_scenes_scenes/bonetown_boss.bundle',
		game_object: 'Boss Scene/Skull King',
		fsm: 'Behaviour'
	},
	{
		name: 'Summoned Saviour',
		file: 'scenes_scenes_scenes/bone_steel_servant.bundle',
		game_object: 'Steel Servant Scene/Battle Scene/Wave 1/Abyss Mass',
		fsm: 'Control'
	},
	{
		name: 'The Unravelled',
		file: 'scenes_scenes_scenes/ward_02_boss.bundle',
		game_object: 'Boss Scene/Conductor Boss',
		fsm: 'Control'
	},
	{
		name: 'Tormented Trobbio',
		file: 'scenes_scenes_scenes/library_13.bundle',
		game_object: 'Grand Stage Scene/Boss Scene TormentedTrobbio/Tormented Trobbio',
		fsm: 'Control'
	},
	{
		name: 'Trobbio',
		file: 'scenes_scenes_scenes/library_13.bundle',
		game_object: 'Grand Stage Scene/Boss Scene Trobbio/Trobbio',
		fsm: 'Control'
	},
	{
		name: 'Voltvyrm',
		file: 'scenes_scenes_scenes/coral_29.bundle',
		game_object: 'Boss Scene/Zap Core Enemy',
		fsm: 'Control'
	},
	{
		name: 'Watcher at the Edge',
		file: 'scenes_scenes_scenes/coral_39.bundle',
		game_object: 'Coral Warrior Grey',
		fsm: 'Control'
	},
	{
		name: 'Widow',
		file: 'scenes_scenes_scenes/belltown_shrine.bundle',
		game_object: 'Black Thread States Thread Only Variant/Normal World/Boss Scene/Spinner Boss',
		fsm: 'Control'
	}
];

// TODO: fandom Bosses (Silksong) still unmapped — no clear arena FSM found in the index yet:
//   - Craggler, Sharpe, Skarrgard: no matching game object found
//   - Great Conchflies / Raging Conchfly: two candidates, assignment unclear —
//       coral_27 | Battle Scene/Wave 1/Coral Conch Driller Giant Solo | Control
//       coral_11 | …/Boss Scene/Coral Conch Driller Giant Mourn | Control
