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

	difficultyLabel: z.string().default('Difficulty'),
	difficultyDescription: z
		.string()
		.default('1 = Easy, 5 = Extreme. Does not change timer settings.'),

	trickyQuestionsLabel: z.string().default('Tricky Questions'),
	trickyQuestionsDescriptionEnabled: z
		.string()
		.default('Uses more plausible distractors and common misconceptions.'),
	trickyQuestionsDescriptionDisabled: z
		.string()
		.default('Standard multiple-choice questions.'),

	players: z.string().default('Players'),
	startButton: z.string().default('Start Game'),
	stopButton: z.string().default('Stop Game'),
	prepareButton: z.string().default('Prepare Game'),
	loading: z.string().default('Loading...'),

	// shared labels
	unknownPlayerName: z.string().default('Unknown'),
	winnerLabel: z.string().default('Winner:'),

	playerNameTitle: z.string().default('Enter Your Name'),
	playerNamePlaceholder: z.string().default('Your name...'),
	playerNameLabel: z.string().default('Name:'),
	playerNameButton: z.string().default('Continue'),

	hostLabel: z.string().default('Host'),
	presenterLabel: z.string().default('Presenter'),
	helpButtonLabel: z.string().default('How to Play'),
	helpDialogDescription: z.string().default('Game instructions and rules'),

	// host mode
	hostGameControlsTitle: z.string().default('Game Controls'),
	hostThemeLabel: z.string().default('Theme'),
	hostLanguageLabel: z.string().default('Language'),
	hostDefaultTheme: z.string().default('General Knowledge'),
	hostDefaultLanguage: z.string().default('English'),
	hostLanguageOptions: z
		.array(z.string())
		.default([
			'English',
			'Spanish',
			'French',
			'German',
			'Italian',
			'Portuguese',
			'Japanese',
			'Korean',
			'Russian',
			'Greek'
		]),
	hostPrepareNeedPlayersSuffix: z.string().default(' (Need 2+ players)'),
	hostPrepareControllerOnlySuffix: z
		.string()
		.default(' (Controller host only)'),
	hostGeneratingQuestionsLabel: z.string().default('Generating questions...'),
	hostCancelButton: z.string().default('Cancel'),
	hostQuestionsReadySuffix: z.string().default('questions ready!'),
	hostChangeSettingsButton: z.string().default('Change Settings'),
	hostQuestionGenerationFailedTitle: z
		.string()
		.default('Question generation failed'),
	hostTryAgainButton: z.string().default('Try Again'),
	hostGameInProgressLabel: z.string().default('Game in progress!'),
	hostBombHolderLabel: z.string().default('Bomb Holder:'),
	fuseTimerExplosionInPrefix: z.string().default('Explosion in:'),
	fuseTimerOverduePrefix: z.string().default('OVERDUE:'),

	gameLinksTitle: z.string().default('Game Links'),
	playerLinkLabel: z.string().default('Player Link'),
	presenterLinkLabel: z.string().default('Presenter Link'),

	// presenter mode
	presenterJoinGameLabel: z.string().default('Join Game'),
	presenterPreparingQuestionsTitle: z.string().default('Preparing Questions'),
	presenterFinalStandingsTitle: z.string().default('Final Standings'),
	presenterLeaderboardRankHeader: z.string().default('Rank'),
	presenterLeaderboardPlayerHeader: z.string().default('Player'),
	presenterLeaderboardCorrectAnswersHeader: z
		.string()
		.default('Correct Answers'),
	presenterLeaderboardBombTimeHeader: z.string().default('Bomb Time (s)'),
	presenterLeaderboardCloseCallsHeader: z.string().default('Close Calls'),
	presenterCurrentQuestionLabel: z.string().default('Current Question'),
	presenterWaitingStartedLabel: z.string().default('Get Ready...'),
	presenterWaitingNotStartedLabel: z.string().default('Waiting for players...'),
	presenterGraveyardTitle: z.string().default('Graveyard'),

	// player game view
	playerGetReadyTitle: z.string().default('Get Ready'),
	playerGameStartingSoonLabel: z.string().default('Game starting soon...'),
	playerGameOverTitle: z.string().default('Game Over!'),
	playerEliminatedTitle: z.string().default('ELIMINATED'),
	playerEliminatedMessage: z.string().default('Better luck next time!'),
	playerHasBombTitle: z.string().default('YOU HAVE THE BOMB!'),
	playerHasBombSubtitle: z.string().default('Answer quickly!'),
	playerLoadingQuestionLabel: z.string().default('Loading question...'),
	playerSafeTitle: z.string().default('SAFE'),
	playerSafeSubtitle: z.string().default('Wait for your turn...'),
	playerBombIsWithLabel: z.string().default('Bomb is with:')
});

export type Config = z.infer<typeof schema>;
