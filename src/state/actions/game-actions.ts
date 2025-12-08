import { kmClient } from '@/services/km-client';
import { globalStore, type Question } from '../stores/global-store';
import { playerStore } from '../stores/player-store';

// Helper to generate a question using AI
async function generateQuestion(
	theme: string,
	difficulty: number,
	usedQuestionIds: string[] = []
): Promise<Question> {
	const difficultyText =
		difficulty === 1 ? 'easy' : difficulty === 2 ? 'medium' : 'hard';

	try {
		const questions = await kmClient.ai.generateJson<Question[]>({
			systemPrompt: `You are a trivia host for a game called "Bomb". Generate a single trivia question as a JSON array containing one object. The object must have fields: id, text, options (array of 4 strings), correctAnswer. The question should be ${difficultyText} difficulty and related to the theme provided.`,
			userPrompt: `Theme: ${theme}. Generate 1 unique question.`,
			temperature: 0.9
		});

		if (questions && questions.length > 0) {
			const q = questions[0];
			// Ensure ID is unique if AI doesn't generate a good one, or just overwrite it
			q.id = Math.random().toString(36).substring(7);
			return q;
		}
		throw new Error('No questions generated');
	} catch (error) {
		console.error('Failed to generate question:', error);
		// Fallback question
		return {
			id: 'fallback-' + Date.now(),
			text: 'What is the capital of France?',
			options: ['London', 'Berlin', 'Paris', 'Madrid'],
			correctAnswer: 'Paris'
		};
	}
}

let isReplenishing = false;

// Helper to replenish the queue in the background
async function replenishQueue() {
	if (isReplenishing) return;

	const state = globalStore.proxy;
	const { gameSettings, usedQuestionIds, questionQueue } = state;

	// Keep 2 questions in reserve
	if (questionQueue.length < 2) {
		isReplenishing = true;
		try {
			const newQuestion = await generateQuestion(
				gameSettings.theme,
				gameSettings.difficulty,
				[...usedQuestionIds, ...questionQueue.map((q) => q.id)]
			);

			await kmClient.transact([globalStore], ([s]) => {
				s.questionQueue.push(newQuestion);
				s.usedQuestionIds.push(newQuestion.id);
			});
		} catch (err) {
			console.error('Background question fetch failed', err);
		} finally {
			isReplenishing = false;
			// If we still need more questions, try again (but let the event loop breathe)
			if (globalStore.proxy.questionQueue.length < 2) {
				setTimeout(replenishQueue, 1000);
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
			replenishQueue(); // Trigger background refill
			return nextQ;
		}
	}

	// Fallback if queue is empty (e.g. start of game or network lag)
	const q = await generateQuestion(
		state.gameSettings.theme,
		state.gameSettings.difficulty,
		state.usedQuestionIds
	);

	// Mark as used immediately
	await kmClient.transact([globalStore], ([s]) => {
		s.usedQuestionIds.push(q.id);
	});

	return q;
}

export const gameActions = {
	async startGame(theme: string) {
		// 1. Set up game state
		await kmClient.transact([globalStore], ([state]) => {
			state.started = true;
			state.startTimestamp = kmClient.serverTimestamp();
			state.gameSettings.theme = theme;
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
	}
};
