import { kmClient } from '@/services/km-client';
import { globalStore, type Question } from '../stores/global-store';
import { playerStore } from '../stores/player-store';

// Helper to generate a question using AI
async function generateQuestions(
	theme: string,
	difficulty: number,
	language: string,
	count: number = 1,
	usedQuestionIds: string[] = []
): Promise<Question[]> {
	const difficultyText =
		difficulty === 1 ? 'easy' : difficulty === 2 ? 'medium' : 'hard';

	try {
		const questions = await kmClient.ai.generateJson<Question[]>({
			model: 'gemini-2.5-flash',
			systemPrompt: `You are a trivia host for a game called "Bomb". Generate ${count} trivia questions as a JSON array of objects. Each object must have fields: id, text, options (array of 4 strings), correctAnswer. The questions should be ${difficultyText} difficulty, related to the theme provided, and in ${language} language.`,
			userPrompt: `Theme: ${theme}. Language: ${language}. Generate ${count} unique questions.`,
			temperature: 0.9
		});

		if (questions && questions.length > 0) {
			return questions.map((q) => ({
				...q,
				id: Math.random().toString(36).substring(7)
			}));
		}
		throw new Error('No questions generated');
	} catch (error) {
		console.error('Failed to generate questions:', error);
		// Fallback questions
		return Array.from({ length: count }).map((_, i) => ({
			id: 'fallback-' + Date.now() + '-' + i,
			text: 'What is the capital of France?',
			options: ['London', 'Berlin', 'Paris', 'Madrid'],
			correctAnswer: 'Paris'
		}));
	}
}

let isReplenishing = false;

// Helper to replenish the queue in the background
async function replenishQueue() {
	if (isReplenishing) return;

	const state = globalStore.proxy;
	const {
		gameSettings,
		usedQuestionIds,
		questionQueue,
		started,
		controllerConnectionId
	} = state;

	// Only the controller should replenish the queue to avoid race conditions
	if (kmClient.connectionId !== controllerConnectionId) return;

	// Don't replenish if game is not started
	if (!started) return;

	// Keep 10 questions in reserve
	if (questionQueue.length < 10) {
		isReplenishing = true;

		// Yield to main thread before starting heavy work
		await new Promise((resolve) => setTimeout(resolve, 0));

		try {
			const newQuestions = await generateQuestions(
				gameSettings.theme,
				gameSettings.difficulty,
				gameSettings.language,
				10,
				[...usedQuestionIds, ...questionQueue.map((q) => q.id)]
			);

			await kmClient.transact([globalStore], ([s]) => {
				s.questionQueue.push(...newQuestions);
				newQuestions.forEach((q) => s.usedQuestionIds.push(q.id));
			});
		} catch (err) {
			console.error('Background question fetch failed', err);
		} finally {
			isReplenishing = false;
			// If we still need more questions, try again (but let the event loop breathe)
			if (globalStore.proxy.questionQueue.length < 10) {
				// Use a longer timeout to prevent tight loops if generation is failing or slow
				setTimeout(replenishQueue, 5000);
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
		state.usedQuestionIds
	);
	const q = questions[0];

	// Mark as used immediately
	await kmClient.transact([globalStore], ([s]) => {
		s.usedQuestionIds.push(q.id);
	});

	// Trigger replenishment asynchronously
	setTimeout(() => replenishQueue(), 100);

	return q;
}

export const gameActions = {
	async startGame(theme: string, language: string = 'English') {
		// 1. Set up game state
		await kmClient.transact([globalStore], ([state]) => {
			state.started = true;
			state.startTimestamp = kmClient.serverTimestamp();
			state.gameSettings.theme = theme;
			state.gameSettings.language = language;
			state.gameSettings.difficulty = 1;
			state.winnerId = null;
			state.questionQueue = [];
			state.usedQuestionIds = [];

			// Initialize all players as alive
			const playerIds = Object.keys(state.players);
			state.playerStatus = {};
			playerIds.forEach((id) => {
				state.playerStatus[id] = 'alive';
			});

			// Pick random bomb holder
			if (playerIds.length > 0) {
				const randomIndex = Math.floor(Math.random() * playerIds.length);
				state.bombHolderId = playerIds[randomIndex];
			}

			// Set explosion time (e.g., 30-60 seconds from now)
			const duration = 30000 + Math.random() * 30000;
			state.bombExplosionTime = kmClient.serverTimestamp() + duration;
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
			const alivePlayers = Object.entries(state.playerStatus)
				.filter(
					([id, status]) => status === 'alive' && id !== state.bombHolderId
				)
				.map(([id]) => id);

			if (alivePlayers.length > 0) {
				const randomIndex = Math.floor(Math.random() * alivePlayers.length);
				state.bombHolderId = alivePlayers[randomIndex];
			}

			state.currentQuestion = nextQ;
		});
	},

	async submitAnswer(questionId: string, answer: string) {
		const { currentQuestion, bombHolderId } = globalStore.proxy;

		// Only bomb holder can answer
		if (kmClient.id !== bombHolderId) return;

		// Check if correct question
		if (!currentQuestion || currentQuestion.id !== questionId) return;

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
			await kmClient.transact([playerStore], ([state]) => {
				state.selectedOption = null; // Reset selection to allow trying again? Or maybe lock it?
				// Usually in bomb games, incorrect answer means you have to try another question or wait penalty.
				// Let's generate a new question.
			});

			const nextQuestion = await getNextQuestion();

			await kmClient.transact([globalStore], ([state]) => {
				state.currentQuestion = nextQuestion;
			});
		}
	},

	async handleExplosion() {
		await kmClient.transact([globalStore], ([state]) => {
			const victimId = state.bombHolderId;
			if (victimId) {
				state.playerStatus[victimId] = 'eliminated';
			}

			const alivePlayers = Object.entries(state.playerStatus)
				.filter(([, status]) => status === 'alive')
				.map(([id]) => id);

			if (alivePlayers.length <= 1) {
				// Game Over
				state.started = false;
				state.winnerId = alivePlayers[0] || null;
				state.bombHolderId = null;
				state.bombExplosionTime = null;
			} else {
				// Continue Game
				// Pick new holder from alive players
				const randomIndex = Math.floor(Math.random() * alivePlayers.length);
				state.bombHolderId = alivePlayers[randomIndex];

				// Reset timer
				const duration = 30000 + Math.random() * 30000;
				state.bombExplosionTime = kmClient.serverTimestamp() + duration;

				// Increase difficulty
				if (state.gameSettings.difficulty < 3) {
					state.gameSettings.difficulty += 1;
				}
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
