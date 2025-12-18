import { z } from 'zod/v4';

export const schema = z.object({
	// translations
	title: z.string().default('My Game'),

	gameLobbyMd: z
		.string()
		.default(
			'# Waiting for game to start...\nThe game will start once the host presses the start button.'
		),

	howToPlayMd: z
		.string()
		.default(
			"# How to Play Bomb\n\n**Objective:** Don't be holding the bomb when it explodes!\n\n1. **Join:** Players scan the QR code to join the game.\n2. **Start:** The Host selects a theme, fuse duration, and timer settings.\n3. **The Bomb:** One player starts with the bomb.\n4. **Pass It:** To pass the bomb, you must answer a trivia question correctly.\n5. **Explosion:** The bomb explodes when the timer runs out. The holder is eliminated.\n6. **Winner:** The last player alive wins!\n\n## Timer Settings\n\n- **Fuse Duration:** How long the bomb timer lasts (10-60 seconds).\n- **Reset on Pass:** When enabled, the timer resets each time the bomb is passed. When disabled, the timer keeps counting down (hot potato style)."
		),

	fuseDurationLabel: z.string().default('Fuse Duration'),
	resetOnPassLabel: z.string().default('Reset Timer on Pass'),
	resetOnPassDescriptionEnabled: z
		.string()
		.default('Timer will reset when the bomb is passed.'),
	resetOnPassDescriptionDisabled: z
		.string()
		.default('Timer continues counting down when passed (hot potato style).'),

	players: z.string().default('Players'),
	timeElapsed: z.string().default('Time elapsed'),
	startButton: z.string().default('Start Game'),
	stopButton: z.string().default('Stop Game'),
	loading: z.string().default('Loading...'),

	menuTitle: z.string().default('Menu'),
	menuGameLobby: z.string().default('Lobby'),

	playerNameTitle: z.string().default('Enter Your Name'),
	playerNamePlaceholder: z.string().default('Your name...'),
	playerNameLabel: z.string().default('Name:'),
	playerNameButton: z.string().default('Continue'),

	hostLabel: z.string().default('Host'),
	presenterLabel: z.string().default('Presenter'),
	helpButtonLabel: z.string().default('How to Play'),

	gameLinksTitle: z.string().default('Game Links'),
	playerLinkLabel: z.string().default('Player Link'),
	presenterLinkLabel: z.string().default('Presenter Link'),

	menuAriaLabel: z.string().default('Open menu drawer')
});

export type Config = z.infer<typeof schema>;
