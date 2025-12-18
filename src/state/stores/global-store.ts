import { kmClient } from '@/services/km-client';

export interface Question {
	id: string;
	text: string;
	options: string[];
	correctAnswer: string;
}

export interface PendingGameSettings {
	theme: string;
	difficulty: number;
	language: string;
	fuseDuration: number;
	resetOnPass: boolean;
	trickyQuestions: boolean;
}

export interface GlobalState {
	controllerClientId: string;
	hostClientIds: string[]; // Track which clients are hosts for controller election
	started: boolean;
	startTimestamp: number;
	countdownEndTime: number | null; // Timestamp when countdown ends and game begins
	players: Record<string, { name: string; photoUrl?: string }>;

	// Question generation phase
	questionGenerationStatus: 'idle' | 'generating' | 'ready' | 'failed';
	questionGenerationProgress: { current: number; total: number };
	pendingGameSettings: PendingGameSettings | null;
	preparedQuestionCount: number; // Total questions prepared for this game (host-controller cache)
	pendingAnswer: {
		clientId: string;
		questionId: string;
		answer: string;
		submittedAt: number;
	} | null;

	// Simplified timer settings
	fuseDuration: number; // Initial fuse duration in ms (10000-60000)
	resetOnPass: boolean; // Whether timer resets when bomb is passed

	// Bomb Game State
	bombHolderId: string | null;
	bombExplosionTime: number | null;
	currentFuseDuration: number;
	currentQuestion: Question | null;
	questionPool: Record<string, Question>; // Deprecated: do not sync full pool (kept for backwards compatibility)
	questionOrder: string[]; // Deprecated: avoid syncing ids; use preparedQuestionCount
	playerSeenQuestions: Record<string, Record<string, true>>; // playerId -> set of seen questionIds
	playerStatus: Record<string, 'alive' | 'eliminated'>;
	winnerId: string | null;

	// Stats
	playerStats: Record<
		string,
		{
			questionsAnswered: number;
			bombHoldTime: number; // in ms
			bombHoldStart: number | null; // timestamp when they got the bomb
			passes: number;
			closeCalls: number; // passes with < 5s left
		}
	>;
	eliminationOrder: Record<string, string>; // key (time-unique) -> playerId, in elimination order

	gameSettings: {
		theme: string;
		difficulty: number;
		language: string;
		trickyQuestions: boolean;
	};
}

const initialState: GlobalState = {
	controllerClientId: '',
	hostClientIds: [],
	started: false,
	startTimestamp: 0,
	countdownEndTime: null,
	players: {},

	// Question generation phase
	questionGenerationStatus: 'idle',
	questionGenerationProgress: { current: 0, total: 0 },
	pendingGameSettings: null,
	preparedQuestionCount: 0,
	pendingAnswer: null,

	fuseDuration: 30000, // 30 seconds default
	resetOnPass: true, // Reset timer on pass by default
	bombHolderId: null,
	bombExplosionTime: null,
	currentFuseDuration: 30000,
	currentQuestion: null,
	questionPool: {},
	questionOrder: [],
	playerSeenQuestions: {},
	playerStatus: {},
	winnerId: null,

	playerStats: {},
	eliminationOrder: {},

	gameSettings: {
		theme: 'General Knowledge',
		difficulty: 1,
		language: 'English',
		trickyQuestions: false
	}
};

export const globalStore = kmClient.store<GlobalState>('global', initialState);
