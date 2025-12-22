import { z } from 'zod/v4';

export const schema = z
	.object({
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
		secondsSuffix: z.string().default('s'),

		playerNameTitle: z.string().default('Enter Your Name'),
		playerNamePlaceholder: z.string().default('Your name...'),
		playerNameLabel: z.string().default('Name:'),
		playerNameButton: z.string().default('Continue'),
		maxPlayers: z.number().int().min(2).max(100).default(25),
		playerLobbyFullError: z
			.string()
			.default('Lobby is full. Please wait for the next round.'),

		// camera capture view
		cameraCaptureTitle: z.string().default('Take Your Photo'),
		cameraCaptureCapturedAlt: z.string().default('Captured'),
		cameraCaptureButtonCapture: z.string().default('Capture Photo'),
		cameraCaptureButtonSkip: z.string().default('Skip'),
		cameraCaptureButtonUploading: z.string().default('Uploading...'),
		cameraCaptureButtonUsePhoto: z.string().default('Use This Photo'),
		cameraCaptureButtonRetake: z.string().default('Retake'),
		cameraCaptureHint: z
			.string()
			.default('Position your face in the frame and click capture'),
		cameraCaptureErrorAccess: z
			.string()
			.default('Could not access camera. You can skip this step.'),
		cameraCaptureErrorRestart: z.string().default('Could not restart camera.'),
		cameraCaptureErrorSave: z
			.string()
			.default('Failed to save photo. Please try again or skip.'),

		hostLabel: z.string().default('Host'),
		presenterLabel: z.string().default('Presenter'),
		helpButtonLabel: z.string().default('How to Play'),
		helpDialogDescription: z.string().default('Game instructions and rules'),

		// host mode
		hostGameControlsTitle: z.string().default('Game Controls'),
		hostThemeLabel: z.string().default('Theme'),
		hostDefaultTheme: z.string().default('General Knowledge'),
		hostDefaultLanguage: z.string().default('English'),
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
		presenterWaitingNotStartedLabel: z
			.string()
			.default('Waiting for players...'),
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
		playerBombIsWithLabel: z.string().default('Bomb is with:'),

		// Fallback questions used when AI generation fails or pool is exhausted
		fallbackQuestions: z
			.array(
				z.object({
					text: z.string(),
					options: z.array(z.string()).min(4).max(4),
					correctAnswer: z.string()
				})
			)
			.min(1)
			.default([
				{
					text: 'What is 2 + 2?',
					options: ['3', '4', '5', '6'],
					correctAnswer: '4'
				}
			]),
		// Question generation tuning
		questionsPerPlayer: z.number().int().min(1).max(10).default(3),
		questionsBaseCount: z.number().int().min(0).max(50).default(5),
		minPreparedQuestions: z.number().int().min(1).max(100).default(20),
		maxPreparedQuestions: z.number().int().min(1).max(100).default(100),
		avoidRecentQuestionsCount: z.number().int().min(0).max(200).default(50)
	})
	.superRefine((cfg, ctx) => {
		if (cfg.minPreparedQuestions > cfg.maxPreparedQuestions) {
			ctx.addIssue({
				code: 'custom',
				path: ['minPreparedQuestions'],
				message: 'minPreparedQuestions must be <= maxPreparedQuestions'
			});
		}
	});

export type Config = z.infer<typeof schema>;
