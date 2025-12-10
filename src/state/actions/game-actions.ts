import { kmClient } from '@/services/km-client';
import {
	globalStore,
	type GameMode,
	type Question
} from '../stores/global-store';
import { playerStore } from '../stores/player-store';

// Models to use for parallel question generation
type AIModel = 'gemini-2.5-flash' | 'gpt-4o-mini';
const AI_MODELS: AIModel[] = ['gemini-2.5-flash', 'gpt-4o-mini'];

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

	const fallbackPool = [
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

	// Fallback questions
	return Array.from({ length: count }).map((_, i) => {
		const fallback = fallbackPool[(Date.now() + i) % fallbackPool.length];
		return {
			id: 'fallback-' + Date.now() + '-' + i,
			text: fallback.text,
			options: fallback.options,
			correctAnswer: fallback.correctAnswer
		};
	});
}

// Helper to get next question SYNCHRONOUSLY from queue, or return a fallback
function getNextQuestionSync(): Question {
	const state = globalStore.proxy;

	// Try to get from queue (will be popped in transaction)
	if (state.questionQueue.length > 0) {
		// Return first item - actual removal happens in transaction
		return state.questionQueue[0];
	}

	// Synchronous fallback - no AI, no waiting
	const fallbackPool = [
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
		}
	];

	const fallback = fallbackPool[Date.now() % fallbackPool.length];
	return {
		id: 'fallback-' + Date.now(),
		text: fallback.text,
		options: fallback.options,
		correctAnswer: fallback.correctAnswer
	};
}

// Helper to get next question (from queue or fallback to fetch)
async function getNextQuestion(): Promise<Question> {
	const state = globalStore.proxy;

	// Try to pop from queue first
	if (state.questionQueue.length > 0) {
		let nextQ: Question | null = null;
		await kmClient.transact([globalStore], ([s]) => {
			nextQ = s.questionQueue.shift() || null;
		});
		if (nextQ) {
			return nextQ;
		}
	}

	// Fallback if queue is empty - generate on-demand
	console.warn('Question queue exhausted - generating on-demand');
	const questions = await generateQuestions(
		state.gameSettings.theme,
		state.gameSettings.difficulty,
		state.gameSettings.language,
		1,
		new Set() // No avoidance in fallback
	);
	return questions[0];
}

// Minimum queue size before replenishment is triggered
const MIN_QUEUE_SIZE = 5;

// Lock to prevent concurrent replenishment
let isReplenishing = false;

export const gameActions = {
	// Called by host to replenish question queue if running low
	async replenishQueueIfNeeded() {
		// Prevent concurrent replenishment calls
		if (isReplenishing) return;

		const state = globalStore.proxy;
		if (!state.started || state.winnerId) return;
		if (state.questionQueue.length >= MIN_QUEUE_SIZE) return;

		isReplenishing = true;

		try {
			const existingQuestions = new Set(
				state.questionQueue.map((q) => q.text.toLowerCase())
			);

			const newQuestions = await generateQuestions(
				state.gameSettings.theme,
				state.gameSettings.difficulty,
				state.gameSettings.language,
				10,
				existingQuestions
			);

			await kmClient.transact([globalStore], ([s]) => {
				// Only add if still needed
				if (s.questionQueue.length < MIN_QUEUE_SIZE) {
					s.questionQueue.push(...newQuestions);
					console.log(
						`Replenished queue: added ${newQuestions.length}, total: ${s.questionQueue.length}`
					);
				}
			});
		} finally {
			isReplenishing = false;
		}
	},

	async startGame(
		theme: string,
		language: string = 'English',
		gameMode: GameMode = 'accelerating'
	) {
		const COUNTDOWN_DURATION = 10000; // 10 seconds

		// 1. Set up game state with countdown
		await kmClient.transact([globalStore], ([state]) => {
			state.started = true;
			state.startTimestamp = kmClient.serverTimestamp();
			state.countdownEndTime = kmClient.serverTimestamp() + COUNTDOWN_DURATION;
			state.gameSettings.theme = theme;
			state.gameSettings.language = language;
			state.gameSettings.difficulty = 1;
			state.gameMode = gameMode;
			state.winnerId = null;

			// Clear bomb state during countdown
			state.bombHolderId = null;
			state.bombExplosionTime = null;
			state.currentQuestion = null;
			state.questionQueue = [];

			// Initialize all players as alive
			const playerIds = Object.keys(state.players);
			state.playerStatus = {};
			state.playerStats = {};
			state.eliminationOrder = [];

			playerIds.forEach((id) => {
				state.playerStatus[id] = 'alive';
				state.playerStats[id] = {
					questionsAnswered: 0,
					bombHoldTime: 0,
					bombHoldStart: null,
					passes: 0,
					closeCalls: 0
				};
			});
		});

		// 2. Generate questions during countdown (runs in parallel with countdown)
		const avoidSet = new Set<string>();
		const initialQuestions: Question[] = [];

		// Generate 20 questions upfront (enough for most games)
		for (let i = 0; i < 2; i++) {
			const batch = await generateQuestions(
				theme,
				1, // Start with easy
				language,
				10,
				avoidSet
			);
			batch.forEach((q) => {
				initialQuestions.push(q);
				avoidSet.add(q.text);
			});
		}

		// 3. Wait for countdown to finish (if questions generated faster)
		const now = kmClient.serverTimestamp();
		const countdownEnd = globalStore.proxy.countdownEndTime || now;
		const remainingWait = countdownEnd - now;
		if (remainingWait > 0) {
			await new Promise((resolve) => setTimeout(resolve, remainingWait));
		}

		// 4. Start the actual game - assign bomb holder and start timer
		await kmClient.transact([globalStore], ([state]) => {
			// Clear countdown
			state.countdownEndTime = null;

			// Add questions to queue
			state.questionQueue = initialQuestions;
			state.currentQuestion = state.questionQueue.shift() || null;

			// Pick random bomb holder
			const playerIds = Object.keys(state.players).filter(
				(id) => state.playerStatus[id] === 'alive'
			);
			if (playerIds.length > 0) {
				const randomIndex = Math.floor(Math.random() * playerIds.length);
				state.bombHolderId = playerIds[randomIndex];
				// Start tracking hold time
				if (state.playerStats[state.bombHolderId]) {
					state.playerStats[state.bombHolderId].bombHoldStart =
						kmClient.serverTimestamp();
				}
			}

			// Set explosion time based on mode
			switch (state.gameMode) {
				case 'classic':
					// Random between 45s and 90s
					state.currentFuseDuration = 45000 + Math.random() * 45000;
					break;
				case 'shot-clock':
					state.currentFuseDuration = 15000;
					break;
				case 'chaos':
					// Random between 5s and 25s
					state.currentFuseDuration = 5000 + Math.random() * 20000;
					break;
				case 'lightning':
					// Ultra-fast constant 8s fuse
					state.currentFuseDuration = 8000;
					break;
				case 'accelerating':
				default:
					state.currentFuseDuration = 30000;
					break;
			}

			state.bombExplosionTime =
				kmClient.serverTimestamp() + state.currentFuseDuration;
		});
	},

	async passBomb() {
		// Get next question synchronously to avoid delays
		const nextQ = getNextQuestionSync();
		const hasQueuedQuestion = globalStore.proxy.questionQueue.length > 0;

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

			const alivePlayers = Object.entries(state.playerStatus)
				.filter(
					([id, status]) => status === 'alive' && id !== state.bombHolderId
				)
				.map(([id]) => id);

			if (alivePlayers.length > 0) {
				const randomIndex = Math.floor(Math.random() * alivePlayers.length);
				state.bombHolderId = alivePlayers[randomIndex];

				// Start tracking for new holder
				if (state.playerStats[state.bombHolderId]) {
					state.playerStats[state.bombHolderId].bombHoldStart = now;
				}

				// Update fuse based on game mode
				switch (state.gameMode) {
					case 'classic':
						// Do not change explosion time
						break;
					case 'shot-clock':
						state.currentFuseDuration = 15000;
						state.bombExplosionTime = now + state.currentFuseDuration;
						break;
					case 'chaos':
						// Random between 5s and 25s
						state.currentFuseDuration = 5000 + Math.random() * 20000;
						state.bombExplosionTime = now + state.currentFuseDuration;
						break;
					case 'lightning':
						// Constant 8s fuse, no change on pass
						break;
					case 'accelerating':
					default:
						// Decrease duration by 2s (min 5s) and reset timer
						state.currentFuseDuration = Math.max(
							5000,
							state.currentFuseDuration - 2000
						);
						state.bombExplosionTime = now + state.currentFuseDuration;
						break;
				}
			}

			// Set new question and pop from queue if queued
			state.currentQuestion = nextQ;
			if (hasQueuedQuestion && state.questionQueue.length > 0) {
				state.questionQueue.shift();
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
			// Incorrect answer: Generate new question for same player
			// Use sync version to avoid delays - queue replenishment happens in background
			const nextQuestion = getNextQuestionSync();
			const hasQueuedQuestion = globalStore.proxy.questionQueue.length > 0;

			await kmClient.transact(
				[globalStore, playerStore],
				([globalState, playerState]) => {
					globalState.currentQuestion = nextQuestion;
					// Pop from queue if we took from it
					if (hasQueuedQuestion && globalState.questionQueue.length > 0) {
						globalState.questionQueue.shift();
					}
					playerState.selectedOption = null;
				}
			);
		}
	},
	async handleExplosion() {
		// Get next question BEFORE transaction to avoid any async delays
		const nextQuestion = getNextQuestionSync();
		const hasQueuedQuestion = globalStore.proxy.questionQueue.length > 0;

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

				const alivePlayers = Object.entries(state.playerStatus)
					.filter(([, status]) => status === 'alive')
					.map(([id]) => id);

				if (alivePlayers.length <= 1) {
					// Game Over
					state.started = false;
					state.winnerId = alivePlayers[0] || null;

					// Add winner to elimination order (last one standing)
					if (state.winnerId) {
						state.eliminationOrder.push(state.winnerId);
					}

					state.bombHolderId = null;
					state.bombExplosionTime = null;
					state.currentQuestion = null;
				} else {
					// Continue Game
					// Pick new holder from alive players
					const randomIndex = Math.floor(Math.random() * alivePlayers.length);
					state.bombHolderId = alivePlayers[randomIndex];

					// Start tracking for new holder
					if (state.playerStats[state.bombHolderId]) {
						state.playerStats[state.bombHolderId].bombHoldStart = now;
					}

					// Reset timer based on mode
					switch (state.gameMode) {
						case 'classic':
							state.currentFuseDuration = 45000 + Math.random() * 45000;
							break;
						case 'shot-clock':
							state.currentFuseDuration = 15000;
							break;
						case 'chaos':
							state.currentFuseDuration = 5000 + Math.random() * 20000;
							break;
						case 'lightning':
							state.currentFuseDuration = 8000;
							break;
						case 'accelerating':
						default:
							state.currentFuseDuration = 30000;
							break;
					}

					state.bombExplosionTime = now + state.currentFuseDuration;

					// Set new question and pop from queue if it was queued
					state.currentQuestion = nextQuestion;
					if (hasQueuedQuestion && state.questionQueue.length > 0) {
						state.questionQueue.shift();
					}
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
			state.questionQueue = [];
		});
	}
};
