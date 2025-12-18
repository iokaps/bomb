import { kmClient } from '@/services/km-client';
import { globalStore, type Question } from '../stores/global-store';
import { playerStore } from '../stores/player-store';

// Models to use for parallel question generation
type AIModel = 'gemini-2.5-flash' | 'gpt-4o-mini';
const AI_MODELS: AIModel[] = ['gemini-2.5-flash', 'gpt-4o-mini'];

// Fallback questions used when AI fails or pool is exhausted
const FALLBACK_QUESTIONS: Omit<Question, 'id'>[] = [
	{
		text: 'What is the capital of France?',
		options: ['London', 'Berlin', 'Paris', 'Madrid'],
		correctAnswer: 'Paris'
	},
	{
		text: 'Which planet is known as the Red Planet?',
		options: ['Venus', 'Mars', 'Jupiter', 'Saturn'],
		correctAnswer: 'Mars'
	},
	{
		text: 'What is 2 + 2?',
		options: ['3', '4', '5', '6'],
		correctAnswer: '4'
	},
	{
		text: 'Who painted the Mona Lisa?',
		options: ['Van Gogh', 'Da Vinci', 'Picasso', 'Rembrandt'],
		correctAnswer: 'Da Vinci'
	},
	{
		text: 'What is the largest ocean?',
		options: ['Atlantic', 'Indian', 'Arctic', 'Pacific'],
		correctAnswer: 'Pacific'
	},
	{
		text: 'Which element has the symbol O?',
		options: ['Gold', 'Oxygen', 'Silver', 'Iron'],
		correctAnswer: 'Oxygen'
	},
	{
		text: 'How many continents are there?',
		options: ['5', '6', '7', '8'],
		correctAnswer: '7'
	},
	{
		text: 'What is the speed of light?',
		options: ['Fast', 'Very Fast', 'Super Fast', '299,792 km/s'],
		correctAnswer: '299,792 km/s'
	},
	{
		text: 'Which animal is the king of the jungle?',
		options: ['Tiger', 'Lion', 'Elephant', 'Giraffe'],
		correctAnswer: 'Lion'
	},
	{
		text: 'What is the boiling point of water?',
		options: ['90°C', '100°C', '110°C', '120°C'],
		correctAnswer: '100°C'
	}
];

// Calculate how many questions to generate based on players and fuse duration
function calculateQuestionCount(
	playerCount: number,
	fuseDurationMs: number
): number {
	// Average time to answer a question: ~5 seconds
	const avgAnswerTime = 5000;

	// Questions per bomb hold = fuse duration / answer time
	const questionsPerHold = Math.ceil(fuseDurationMs / avgAnswerTime);

	// Estimated rounds before game ends = players * 3 (multiple passes per elimination)
	const estimatedRounds = playerCount * 3;

	// Total with 50% buffer for wrong answers
	const totalQuestions = Math.ceil(questionsPerHold * estimatedRounds * 1.5);

	// Minimum 20, maximum 100 questions
	return Math.max(20, Math.min(100, totalQuestions));
}

// Get a fallback question
function getFallbackQuestion(): Question {
	const fallback = FALLBACK_QUESTIONS[Date.now() % FALLBACK_QUESTIONS.length];
	return {
		id:
			'fallback-' + Date.now() + '-' + Math.random().toString(36).substring(7),
		...fallback
	};
}

// Helper to generate questions from a single model
async function generateQuestionsFromModel(
	model: AIModel,
	theme: string,
	difficulty: number,
	language: string,
	count: number,
	avoidQuestions: Set<string>
): Promise<Question[]> {
	const difficultyText =
		difficulty === 1
			? 'easy'
			: difficulty === 2
				? 'medium'
				: difficulty === 3
					? 'hard'
					: 'very hard';

	// Take the last 50 questions to give the AI context on what to avoid
	const recentQuestions = Array.from(avoidQuestions).slice(-50);
	const avoidText =
		recentQuestions.length > 0
			? `\nDo NOT use these questions or similar ones: ${JSON.stringify(recentQuestions)}`
			: '';

	const chatPromise = kmClient.ai.chat({
		model,
		systemPrompt: `You are a trivia host for a fast-paced live game called "Bomb". Generate ${count} trivia questions as a JSON array of objects. Each object must have fields: id, text, options (array of 4 strings), correctAnswer. 
		
		Difficulty Level: ${difficultyText}
		
		Difficulty Guidelines:
		- Easy (1): Common knowledge, facts everyone knows (e.g., "What is the capital of France?")
		- Medium (2): General knowledge requiring some education (e.g., "In what year did World War II end?")
		- Hard (3): Specific facts, lesser-known information (e.g., "What is the atomic number of gold?")
		- Very Hard (4): Obscure facts, expert-level knowledge (e.g., "Who was the 13th Prime Minister of Canada?")
		
		General Guidelines:
		- Output ONLY valid JSON. No markdown, no code blocks, no explanations.
		- Theme: ${theme}
		- Language: ${language}
		- Style: Concise, short, and punchy. Suitable for reading quickly on a screen. Max 15 words per question.
		- Options: Keep options short (1-3 words ideally).
		- Variety: Ensure questions cover different sub-topics within the theme. Avoid repetitive question patterns.
		- Uniqueness: Do not repeat questions from the provided list.
		- CRITICAL: Questions MUST match the ${difficultyText} difficulty level exactly.
		- Strict Mode: Return raw JSON only. Do not include any conversational text.
		- Format: [{"id": "1", "text": "Question?", "options": ["A", "B", "C", "D"], "correctAnswer": "A"}]
		${avoidText}`,
		userPrompt: `Generate ${count} unique and diverse ${difficultyText} questions about "${theme}" in ${language}.`,
		temperature: 0.9
	});

	// 15 second timeout
	const timeoutPromise = new Promise<{ content: string }>((_, reject) =>
		setTimeout(() => reject(new Error(`${model} timed out`)), 15000)
	);

	const { content } = await Promise.race([chatPromise, timeoutPromise]);

	let jsonString = content.trim();
	// Strip markdown code blocks if present
	if (jsonString.startsWith('```json')) {
		jsonString = jsonString.replace(/^```json\s*/, '').replace(/\s*```$/, '');
	} else if (jsonString.startsWith('```')) {
		jsonString = jsonString.replace(/^```\s*/, '').replace(/\s*```$/, '');
	}

	// Attempt to fix common JSON errors (trailing commas)
	jsonString = jsonString.replace(/,\s*]/g, ']').replace(/,\s*}/g, '}');

	const questions = JSON.parse(jsonString) as Question[];

	if (!questions || !Array.isArray(questions)) {
		return [];
	}

	// Validate structure
	return questions.filter(
		(q) =>
			q &&
			typeof q.text === 'string' &&
			Array.isArray(q.options) &&
			q.options.length === 4 &&
			typeof q.correctAnswer === 'string'
	);
}

// Helper to generate questions using multiple AI models in parallel
async function generateQuestions(
	theme: string,
	difficulty: number,
	language: string,
	count: number = 1,
	avoidQuestions: Set<string> = new Set()
): Promise<Question[]> {
	// Calculate how many questions to request from each model
	// Request slightly more to account for duplicates and failures
	const questionsPerModel = Math.ceil((count * 0.7) / AI_MODELS.length) + 2;

	console.log(
		`Generating ${count} questions using ${AI_MODELS.length} models (${questionsPerModel} each)...`
	);

	// Call all models in parallel
	const modelPromises = AI_MODELS.map((model) =>
		generateQuestionsFromModel(
			model,
			theme,
			difficulty,
			language,
			questionsPerModel,
			avoidQuestions
		).catch((error) => {
			console.error(`${model} failed:`, error);
			return [] as Question[];
		})
	);

	const results = await Promise.allSettled(modelPromises);

	// Collect all questions from successful calls
	const allQuestions: Question[] = [];
	results.forEach((result, index) => {
		if (result.status === 'fulfilled' && result.value.length > 0) {
			console.log(
				`${AI_MODELS[index]} returned ${result.value.length} questions`
			);
			allQuestions.push(...result.value);
		} else if (result.status === 'rejected') {
			console.error(`${AI_MODELS[index]} rejected:`, result.reason);
		}
	});

	// Deduplicate by question text (case-insensitive)
	const seenTexts = new Set<string>();
	const uniqueQuestions = allQuestions.filter((q) => {
		const normalizedText = q.text.toLowerCase().trim();
		if (seenTexts.has(normalizedText) || avoidQuestions.has(q.text)) {
			return false;
		}
		seenTexts.add(normalizedText);
		return true;
	});

	console.log(
		`Combined ${allQuestions.length} questions, ${uniqueQuestions.length} unique after dedup`
	);

	if (uniqueQuestions.length > 0) {
		// Assign unique IDs and return up to the requested count
		return uniqueQuestions.slice(0, count).map((q) => ({
			...q,
			id: Math.random().toString(36).substring(7)
		}));
	}

	console.warn('All models failed, using fallback');

	// Fallback questions using the shared pool
	return Array.from({ length: count }).map((_, i) => {
		const fallback =
			FALLBACK_QUESTIONS[(Date.now() + i) % FALLBACK_QUESTIONS.length];
		return {
			id: 'fallback-' + Date.now() + '-' + i,
			text: fallback.text,
			options: fallback.options,
			correctAnswer: fallback.correctAnswer
		};
	});
}

// Select a random question the player hasn't seen yet
function selectQuestionForPlayer(playerId: string): Question {
	const state = globalStore.proxy;
	const seenIds = new Set(state.playerSeenQuestions[playerId] || []);

	// Filter to unseen questions
	const unseenQuestions = state.questionPool.filter((q) => !seenIds.has(q.id));

	// If player has seen all questions, use full pool (will reset history in transaction)
	const availableQuestions =
		unseenQuestions.length > 0 ? unseenQuestions : state.questionPool;

	if (availableQuestions.length === 0) {
		// No questions in pool at all, use fallback
		return getFallbackQuestion();
	}

	// Pick random question
	const randomIndex = Math.floor(Math.random() * availableQuestions.length);
	return availableQuestions[randomIndex];
}

export const gameActions = {
	/**
	 * Phase 1: Prepare the game by generating all questions
	 * This should be called before startGame()
	 */
	async prepareGame(
		theme: string,
		language: string = 'English',
		fuseDuration: number = 30000,
		resetOnPass: boolean = true
	) {
		const playerCount = Object.keys(globalStore.proxy.players).length;
		const questionCount = calculateQuestionCount(playerCount, fuseDuration);

		console.log(
			`Preparing game: generating ${questionCount} questions for ${playerCount} players (fuse: ${fuseDuration}ms)...`
		);

		// 1. Set up generation state and store pending settings
		await kmClient.transact([globalStore], ([state]) => {
			state.questionGenerationStatus = 'generating';
			state.questionGenerationProgress = { current: 0, total: questionCount };
			state.pendingGameSettings = {
				theme,
				language,
				fuseDuration,
				resetOnPass
			};
			state.questionPool = [];
			state.gameSettings.theme = theme;
			state.gameSettings.language = language;
		});

		// 2. Generate questions in batches
		const avoidSet = new Set<string>();
		const allQuestions: Question[] = [];
		const batchSize = 15;
		const batches = Math.ceil(questionCount / batchSize);

		try {
			for (let i = 0; i < batches; i++) {
				// Check if preparation was cancelled
				if (globalStore.proxy.questionGenerationStatus !== 'generating') {
					console.log('Question generation cancelled');
					return;
				}

				const remaining = questionCount - allQuestions.length;
				const toGenerate = Math.min(batchSize, remaining);

				const batch = await generateQuestions(
					theme,
					1, // Start with easy
					language,
					toGenerate,
					avoidSet
				);
				batch.forEach((q) => {
					allQuestions.push(q);
					avoidSet.add(q.text);
				});

				// Update progress
				await kmClient.transact([globalStore], ([state]) => {
					state.questionGenerationProgress = {
						current: allQuestions.length,
						total: questionCount
					};
				});

				console.log(
					`Generated batch ${i + 1}/${batches}: ${allQuestions.length}/${questionCount} questions`
				);
			}

			// 3. Mark as ready and store questions
			await kmClient.transact([globalStore], ([state]) => {
				state.questionPool = allQuestions;
				state.questionGenerationStatus = 'ready';
			});

			console.log(
				`Question generation complete: ${allQuestions.length} questions ready`
			);
		} catch (err) {
			console.error('Error generating questions:', err);
			await kmClient.transact([globalStore], ([state]) => {
				state.questionGenerationStatus = 'failed';
			});
			throw err;
		}
	},

	/**
	 * Cancel the preparation phase and reset to idle
	 */
	async cancelPreparation() {
		await kmClient.transact([globalStore], ([state]) => {
			state.questionGenerationStatus = 'idle';
			state.questionGenerationProgress = { current: 0, total: 0 };
			state.pendingGameSettings = null;
			state.questionPool = [];
		});
		console.log('Preparation cancelled');
	},

	/**
	 * Phase 2: Start the game (assumes questions are already prepared)
	 */
	async startGame() {
		const COUNTDOWN_DURATION = 5000; // 5 seconds

		// Validate that questions are ready
		const { questionGenerationStatus, pendingGameSettings, questionPool } =
			globalStore.proxy;

		if (questionGenerationStatus !== 'ready' || !pendingGameSettings) {
			throw new Error('Cannot start game: questions not prepared');
		}

		if (questionPool.length === 0) {
			throw new Error('Cannot start game: no questions in pool');
		}

		const { fuseDuration, resetOnPass } = pendingGameSettings;

		// 1. Set up game state with countdown
		await kmClient.transact([globalStore], ([state]) => {
			state.started = true;
			state.startTimestamp = kmClient.serverTimestamp();
			state.countdownEndTime = kmClient.serverTimestamp() + COUNTDOWN_DURATION;
			state.gameSettings.difficulty = 1;
			state.fuseDuration = fuseDuration;
			state.resetOnPass = resetOnPass;
			state.winnerId = null;

			// Clear bomb state during countdown
			state.bombHolderId = null;
			state.bombExplosionTime = null;
			state.currentQuestion = null;
			state.playerSeenQuestions = {};

			// Initialize all players as alive
			const playerIds = Object.keys(state.players);
			state.playerStatus = {};
			state.playerStats = {};
			state.eliminationOrder = [];

			playerIds.forEach((id) => {
				state.playerStatus[id] = 'alive';
				state.playerSeenQuestions[id] = [];
				state.playerStats[id] = {
					questionsAnswered: 0,
					bombHoldTime: 0,
					bombHoldStart: null,
					passes: 0,
					closeCalls: 0
				};
			});

			// Clear preparation state
			state.questionGenerationStatus = 'idle';
			state.questionGenerationProgress = { current: 0, total: 0 };
			state.pendingGameSettings = null;
		});

		// 2. Wait for countdown to finish
		await new Promise((resolve) => setTimeout(resolve, COUNTDOWN_DURATION));

		// 3. Start the actual game - assign bomb holder and select first question
		await kmClient.transact([globalStore], ([state]) => {
			// Clear countdown
			state.countdownEndTime = null;

			// Pick random bomb holder
			const playerIds = Object.keys(state.players).filter(
				(id) => state.playerStatus[id] === 'alive'
			);
			if (playerIds.length > 0) {
				const randomIndex = Math.floor(Math.random() * playerIds.length);
				state.bombHolderId = playerIds[randomIndex];

				// Select first question for bomb holder (unseen by them)
				const firstQuestion = selectQuestionForPlayer(state.bombHolderId);
				state.currentQuestion = firstQuestion;
				state.playerSeenQuestions[state.bombHolderId].push(firstQuestion.id);

				// Start tracking hold time
				if (state.playerStats[state.bombHolderId]) {
					state.playerStats[state.bombHolderId].bombHoldStart =
						kmClient.serverTimestamp();
				}
			}

			// Set explosion time using configured fuse duration
			state.currentFuseDuration = state.fuseDuration;
			state.bombExplosionTime =
				kmClient.serverTimestamp() + state.currentFuseDuration;
		});
	},

	async passBomb() {
		// Select question for new holder before transaction
		const currentBombHolderId = globalStore.proxy.bombHolderId;
		const alivePlayers = Object.entries(globalStore.proxy.playerStatus)
			.filter(
				([id, status]) => status === 'alive' && id !== currentBombHolderId
			)
			.map(([id]) => id);

		// Pre-select next holder and their question
		const nextHolderIndex = Math.floor(Math.random() * alivePlayers.length);
		const nextHolderId = alivePlayers[nextHolderIndex];
		const nextQuestion = nextHolderId
			? selectQuestionForPlayer(nextHolderId)
			: getFallbackQuestion();

		await kmClient.transact([globalStore], ([state]) => {
			const currentHolderId = state.bombHolderId;
			const now = kmClient.serverTimestamp();

			// Update stats for current holder
			if (currentHolderId && state.playerStats[currentHolderId]) {
				const stats = state.playerStats[currentHolderId];
				stats.questionsAnswered += 1;
				stats.passes += 1;

				if (stats.bombHoldStart) {
					stats.bombHoldTime += now - stats.bombHoldStart;
					stats.bombHoldStart = null;
				}

				// Check for close call (< 5 seconds left)
				if (state.bombExplosionTime && state.bombExplosionTime - now < 5000) {
					stats.closeCalls += 1;
				}
			}

			if (nextHolderId) {
				state.bombHolderId = nextHolderId;

				// Start tracking for new holder
				if (state.playerStats[state.bombHolderId]) {
					state.playerStats[state.bombHolderId].bombHoldStart = now;
				}

				// Update fuse based on resetOnPass setting
				if (state.resetOnPass) {
					// Reset timer to configured fuse duration
					state.currentFuseDuration = state.fuseDuration;
					state.bombExplosionTime = now + state.currentFuseDuration;
				}
				// If resetOnPass is false, timer continues counting down (hot potato style)

				// Set new question for the new holder
				state.currentQuestion = nextQuestion;

				// Mark question as seen by new holder
				if (!state.playerSeenQuestions[nextHolderId]) {
					state.playerSeenQuestions[nextHolderId] = [];
				}
				// Reset seen list if they've seen all questions
				if (
					state.playerSeenQuestions[nextHolderId].length >=
					state.questionPool.length
				) {
					state.playerSeenQuestions[nextHolderId] = [];
				}
				state.playerSeenQuestions[nextHolderId].push(nextQuestion.id);
			}
		});
	},

	async submitAnswer(questionId: string, answer: string) {
		const { currentQuestion, bombHolderId } = globalStore.proxy;

		// Only bomb holder can answer
		if (kmClient.id !== bombHolderId) {
			// Ensure selection is cleared if we are not the bomb holder
			await kmClient.transact([playerStore], ([state]) => {
				state.selectedOption = null;
			});
			return;
		}

		// Check if correct question
		if (!currentQuestion || currentQuestion.id !== questionId) {
			// Ensure selection is cleared if question changed (race condition fix)
			await kmClient.transact([playerStore], ([state]) => {
				state.selectedOption = null;
			});
			return;
		}

		const isCorrect = answer === currentQuestion.correctAnswer;

		if (isCorrect) {
			// Pass the bomb
			await this.passBomb();

			// Reset local selection
			await kmClient.transact([playerStore], ([state]) => {
				state.selectedOption = null;
				state.lastAnsweredQuestionId = questionId;
			});
		} else {
			// Incorrect answer: Select new question for same player (unseen by them)
			const nextQuestion = selectQuestionForPlayer(bombHolderId);

			await kmClient.transact(
				[globalStore, playerStore],
				([globalState, playerState]) => {
					globalState.currentQuestion = nextQuestion;

					// Mark question as seen by current holder
					if (!globalState.playerSeenQuestions[bombHolderId]) {
						globalState.playerSeenQuestions[bombHolderId] = [];
					}
					// Reset seen list if they've seen all questions
					if (
						globalState.playerSeenQuestions[bombHolderId].length >=
						globalState.questionPool.length
					) {
						globalState.playerSeenQuestions[bombHolderId] = [];
					}
					globalState.playerSeenQuestions[bombHolderId].push(nextQuestion.id);

					playerState.selectedOption = null;
				}
			);
		}
	},
	async handleExplosion() {
		// Pre-calculate next holder and their question before transaction
		const alivePlayers = Object.entries(globalStore.proxy.playerStatus)
			.filter(([, status]) => status === 'alive')
			.filter(([id]) => id !== globalStore.proxy.bombHolderId)
			.map(([id]) => id);

		const nextHolderIndex = Math.floor(Math.random() * alivePlayers.length);
		const nextHolderId = alivePlayers[nextHolderIndex];
		const nextQuestion = nextHolderId
			? selectQuestionForPlayer(nextHolderId)
			: null;

		try {
			await kmClient.transact([globalStore], ([state]) => {
				const victimId = state.bombHolderId;
				const now = kmClient.serverTimestamp();

				if (victimId) {
					state.playerStatus[victimId] = 'eliminated';
					state.eliminationOrder.push(victimId);

					// Finalize stats for victim
					if (
						state.playerStats[victimId] &&
						state.playerStats[victimId].bombHoldStart
					) {
						state.playerStats[victimId].bombHoldTime +=
							now - state.playerStats[victimId].bombHoldStart;
						state.playerStats[victimId].bombHoldStart = null;
					}

					// Increase difficulty after each elimination (cap at 4)
					if (state.gameSettings.difficulty < 4) {
						state.gameSettings.difficulty += 1;
					}
				}

				const remainingPlayers = Object.entries(state.playerStatus)
					.filter(([, status]) => status === 'alive')
					.map(([id]) => id);

				if (remainingPlayers.length <= 1) {
					// Game Over
					state.started = false;
					state.winnerId = remainingPlayers[0] || null;

					// Add winner to elimination order (last one standing)
					if (state.winnerId) {
						state.eliminationOrder.push(state.winnerId);
					}

					state.bombHolderId = null;
					state.bombExplosionTime = null;
					state.currentQuestion = null;
				} else if (nextHolderId && nextQuestion) {
					// Continue Game
					state.bombHolderId = nextHolderId;

					// Start tracking for new holder
					if (state.playerStats[state.bombHolderId]) {
						state.playerStats[state.bombHolderId].bombHoldStart = now;
					}

					// Reset timer to configured fuse duration
					state.currentFuseDuration = state.fuseDuration;
					state.bombExplosionTime = now + state.currentFuseDuration;

					// Set new question for the new holder
					state.currentQuestion = nextQuestion;

					// Mark question as seen by new holder
					if (!state.playerSeenQuestions[nextHolderId]) {
						state.playerSeenQuestions[nextHolderId] = [];
					}
					// Reset seen list if they've seen all questions
					if (
						state.playerSeenQuestions[nextHolderId].length >=
						state.questionPool.length
					) {
						state.playerSeenQuestions[nextHolderId] = [];
					}
					state.playerSeenQuestions[nextHolderId].push(nextQuestion.id);
				}
			});
		} catch (err) {
			console.error('Error in handleExplosion:', err);
			throw err;
		}
	},

	async stopGame() {
		await kmClient.transact([globalStore], ([state]) => {
			state.started = false;
			state.bombHolderId = null;
			state.bombExplosionTime = null;
			state.currentQuestion = null;
			state.questionPool = [];
			state.playerSeenQuestions = {};

			// Reset preparation state
			state.questionGenerationStatus = 'idle';
			state.questionGenerationProgress = { current: 0, total: 0 };
			state.pendingGameSettings = null;
		});
	}
};
