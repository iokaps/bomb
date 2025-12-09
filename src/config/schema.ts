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
			"# How to Play Bomb\n\n**Objective:** Don't be holding the bomb when it explodes!\n\n1. **Join:** Players scan the QR code to join the game.\n2. **Start:** The Host selects a theme and starts the game.\n3. **The Bomb:** One player starts with the bomb.\n4. **Pass It:** To pass the bomb, you must answer a trivia question correctly.\n5. **Explosion:** The bomb explodes after a random time (30-60s). The holder is eliminated.\n6. **Accelerating Fuse:** With every pass, the fuse gets shorter!\n7. **Winner:** The last player alive wins!\n\n## Game Modes\n\n- **Accelerating Fuse:** Fuse starts at 30s and gets shorter by 2s every pass (min 5s).\n- **Classic (Hot Potato):** Global random timer (45-90s). Passing doesn't change the timer.\n- **Shot Clock:** Timer resets to 15s on every pass.\n- **Chaos Mode:** Fuse resets to a random duration (5-25s) on every pass."
		),

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
