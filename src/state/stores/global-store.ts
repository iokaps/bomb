import { kmClient } from '@/services/km-client';

export interface Question {
	id: string;
	text: string;
	options: string[];
	correctAnswer: string;
}

export interface PendingGameSettings {
	theme: string;
	language: string;
	fuseDuration: number;
	resetOnPass: boolean;
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

	// Simplified timer settings
	fuseDuration: number; // Initial fuse duration in ms (10000-60000)
	resetOnPass: boolean; // Whether timer resets when bomb is passed

	// Bomb Game State
	bombHolderId: string | null;
	bombExplosionTime: number | null;
	currentFuseDuration: number;
	currentQuestion: Question | null;
	questionPool: Question[]; // All pre-generated questions for this game
	playerSeenQuestions: Record<string, string[]>; // playerId -> array of questionIds they've seen
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
	eliminationOrder: string[]; // IDs of players in order of elimination

	gameSettings: {
		theme: string;
		difficulty: number;
		language: string;
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

	fuseDuration: 30000, // 30 seconds default
	resetOnPass: true, // Reset timer on pass by default
	bombHolderId: null,
	bombExplosionTime: null,
	currentFuseDuration: 30000,
	currentQuestion: null,
	questionPool: [],
	playerSeenQuestions: {},
	playerStatus: {},
	winnerId: null,

	playerStats: {},
	eliminationOrder: [],

	gameSettings: {
		theme: 'General Knowledge',
		difficulty: 1,
		language: 'English'
	}
};

export const globalStore = kmClient.store<GlobalState>('global', initialState);
