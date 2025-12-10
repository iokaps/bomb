import { kmClient } from '@/services/km-client';

export interface Question {
	id: string;
	text: string;
	options: string[];
	correctAnswer: string;
}

export type GameMode =
	| 'accelerating'
	| 'classic'
	| 'shot-clock'
	| 'chaos'
	| 'lightning';

export interface GlobalState {
	controllerClientId: string;
	hostClientIds: string[]; // Track which clients are hosts for controller election
	started: boolean;
	startTimestamp: number;
	countdownEndTime: number | null; // Timestamp when countdown ends and game begins
	players: Record<string, { name: string; photoUrl?: string }>;
	gameMode: GameMode;

	// Bomb Game State
	bombHolderId: string | null;
	bombExplosionTime: number | null;
	currentFuseDuration: number;
	currentQuestion: Question | null;
	questionQueue: Question[];
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
	gameMode: 'accelerating',
	bombHolderId: null,
	bombExplosionTime: null,
	currentFuseDuration: 30000,
	currentQuestion: null,
	questionQueue: [],
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
