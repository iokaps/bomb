import { kmClient } from '@/services/km-client';
import {
	globalStore,
	type GameMode,
	type Question
} from '../stores/global-store';
import { playerStore } from '../stores/player-store';

// Helper to generate a question using AI
async function generateQuestions(
	theme: string,
	difficulty: number,
	language: string,
	count: number = 1,
	avoidQuestions: string[] = []
): Promise<Question[]> {
	const difficultyText =
		difficulty === 1 ? 'easy' : difficulty === 2 ? 'medium' : 'hard';
	const collectedQuestions: Question[] = [];
	let attempts = 0;
	const maxAttempts = 3;

	while (collectedQuestions.length < count && attempts < maxAttempts) {
		attempts++;
		const needed = count - collectedQuestions.length;

		// Take the last 50 questions to give the AI context on what to avoid
		const currentAvoidList = [
			...avoidQuestions,
			...collectedQuestions.map((q) => q.text)
		];
		const recentQuestions = currentAvoidList.slice(-50);
		const avoidText =
			recentQuestions.length > 0
				? `\nDo NOT use these questions or similar ones: ${JSON.stringify(recentQuestions)}`
				: '';

		try {
			// Use chat instead of generateJson to handle parsing manually
			// This avoids SyntaxErrors if the model returns markdown or malformed JSON
			// Add timeout to prevent freezing
			const chatPromise = kmClient.ai.chat({
				model: 'gemini-2.5-flash',
				systemPrompt: `You are a trivia host for a fast-paced live game called "Bomb". Generate ${needed} trivia questions as a JSON array of objects. Each object must have fields: id, text, options (array of 4 strings), correctAnswer. 
			
			Guidelines:
			- Output ONLY valid JSON. No markdown, no code blocks, no explanations.
			- Difficulty: ${difficultyText}
			- Theme: ${theme}
			- Language: ${language}
			- Style: Concise, short, and punchy. Suitable for reading quickly on a screen. Max 15 words per question.
			- Options: Keep options short (1-3 words ideally).
			- Variety: Ensure questions cover different sub-topics within the theme. Avoid repetitive question patterns.
			- Uniqueness: Do not repeat questions from the provided list.
			- Strict Mode: Return raw JSON only. Do not include any conversational text.
			${avoidText}`,
				userPrompt: `Generate ${needed} unique and diverse questions about "${theme}" in ${language}.`,
				temperature: 0.9 + (attempts - 1) * 0.1
			});

			// 8 second timeout
			const timeoutPromise = new Promise<{ content: string }>((_, reject) =>
				setTimeout(() => reject(new Error('AI generation timed out')), 8000)
			);

			const { content } = await Promise.race([chatPromise, timeoutPromise]);

			let jsonString = content.trim();
			// Strip markdown code blocks if present
			if (jsonString.startsWith('```json')) {
				jsonString = jsonString
					.replace(/^```json\s*/, '')
					.replace(/\s*```$/, '');
			} else if (jsonString.startsWith('```')) {
				jsonString = jsonString.replace(/^```\s*/, '').replace(/\s*```$/, '');
			}

			const questions = JSON.parse(jsonString) as Question[];

			if (questions && Array.isArray(questions) && questions.length > 0) {
				// Validate structure
				const validQuestions = questions.filter(
					(q) =>
						q &&
						typeof q.text === 'string' &&
						Array.isArray(q.options) &&
						q.options.length === 4 &&
						typeof q.correctAnswer === 'string'
				);

				// Client-side filtering to ensure no duplicates from the full history
				const uniqueNew = validQuestions.filter(
					(q) => !currentAvoidList.includes(q.text)
				);

				collectedQuestions.push(...uniqueNew);
			}
		} catch (error) {
			console.error(`Attempt ${attempts} failed:`, error);
			// Wait a bit before retry
			await new Promise((resolve) => setTimeout(resolve, 1000));
		}
	}

	if (collectedQuestions.length > 0) {
		return collectedQuestions.map((q) => ({
			...q,
			id: Math.random().toString(36).substring(7)
		}));
	}

	console.warn('All generation attempts failed, using fallback');

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

let isReplenishing = false;

// Helper to replenish the queue in the background
async function replenishQueue() {
	if (isReplenishing) return;

	const state = globalStore.proxy;
	const {
		gameSettings,
		usedQuestionTexts,
		questionQueue,
		started,
		controllerConnectionId
	} = state;

	// Only the controller should replenish the queue to avoid race conditions
	if (
		!kmClient.connectionId ||
		kmClient.connectionId !== controllerConnectionId
	) {
		return;
	}

	// Don't replenish if game is not started
	if (!started) return;

	// Keep 20 questions in reserve
	if (questionQueue.length < 20) {
		console.log(
			`Replenishing queue. Current size: ${questionQueue.length}. Target: 20`
		);
		isReplenishing = true;

		// Yield to main thread before starting heavy work
		await new Promise((resolve) => setTimeout(resolve, 0));

		try {
			// Calculate future difficulty based on total questions generated so far
			// This ensures the queue contains questions of the appropriate difficulty for when they are reached
			const totalGenerated = usedQuestionTexts.length + questionQueue.length;
			let targetDifficulty = 1;
			if (totalGenerated >= 25)
				targetDifficulty = 3; // Hard after 25
			else if (totalGenerated >= 10) targetDifficulty = 2; // Medium after 10

			// Request batch of 10 to ensure we stay ahead of gameplay
			const newQuestions = await generateQuestions(
				gameSettings.theme,
				targetDifficulty,
				gameSettings.language,
				10,
				[...usedQuestionTexts, ...questionQueue.map((q) => q.text)]
			);

			console.log(`Generated ${newQuestions.length} new questions`);

			// Check if game is still started before updating
			if (!globalStore.proxy.started) return;

			await kmClient.transact([globalStore], ([s]) => {
				s.questionQueue.push(...newQuestions);
				newQuestions.forEach((q) => s.usedQuestionTexts.push(q.text));
			});
		} catch (err) {
			console.error('Background question fetch failed', err);
		} finally {
			isReplenishing = false;
			// If we still need more questions, try again
			const currentSize = globalStore.proxy.questionQueue.length;
			if (currentSize < 20) {
				// If critically low, retry quickly. Otherwise wait a bit.
				const delay = currentSize < 5 ? 500 : 2000;
				setTimeout(replenishQueue, delay);
			}
		}
	}
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
			// Trigger background refill asynchronously
			setTimeout(() => replenishQueue(), 100);
			return nextQ;
		}
	}

	// Fallback if queue is empty (e.g. start of game or network lag)
	const questions = await generateQuestions(
		state.gameSettings.theme,
		state.gameSettings.difficulty,
		state.gameSettings.language,
		1,
		state.usedQuestionTexts
	);
	const q = questions[0];

	// Mark as used immediately
	await kmClient.transact([globalStore], ([s]) => {
		s.usedQuestionTexts.push(q.text);
	});

	// Trigger replenishment asynchronously
	setTimeout(() => replenishQueue(), 100);

	return q;
}

export const gameActions = {
	async startGame(
		theme: string,
		language: string = 'English',
		gameMode: GameMode = 'accelerating'
	) {
		// 1. Set up game state
		await kmClient.transact([globalStore], ([state]) => {
			state.started = true;
			state.startTimestamp = kmClient.serverTimestamp();
			state.gameSettings.theme = theme;
			state.gameSettings.language = language;
			state.gameSettings.difficulty = 1;
			state.gameMode = gameMode;
			state.winnerId = null;

			// Always clear queue on start to ensure questions match the new theme
			state.questionQueue = [];
			state.usedQuestionTexts = [];

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

			// Pick random bomb holder
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
			switch (gameMode) {
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
				case 'accelerating':
				default:
					state.currentFuseDuration = 30000;
					break;
			}

			state.bombExplosionTime =
				kmClient.serverTimestamp() + state.currentFuseDuration;
		});

		// 2. Generate first question immediately
		const firstQuestion = await getNextQuestion();
		await kmClient.transact([globalStore], ([state]) => {
			state.currentQuestion = firstQuestion;
		});

		// 3. Fill the buffer for subsequent turns
		replenishQueue();
		replenishQueue();
	},

	async passBomb() {
		// Get next question INSTANTLY from queue
		const nextQ = await getNextQuestion();

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

			state.currentQuestion = nextQ;
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
			// Keep selection locked while fetching new question to prevent double-clicks

			const nextQuestion = await getNextQuestion();

			await kmClient.transact(
				[globalStore, playerStore],
				([globalState, playerState]) => {
					globalState.currentQuestion = nextQuestion;
					playerState.selectedOption = null;
				}
			);
		}
	},
	async handleExplosion() {
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
					case 'accelerating':
					default:
						state.currentFuseDuration = 30000;
						break;
				}

				state.bombExplosionTime = now + state.currentFuseDuration;
			}
		});

		// If game continues, generate new question
		if (globalStore.proxy.started) {
			const nextQuestion = await getNextQuestion();

			await kmClient.transact([globalStore], ([state]) => {
				state.currentQuestion = nextQuestion;
			});
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
	},

	checkQueue() {
		replenishQueue();
	}
};
