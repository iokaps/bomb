import { kmClient } from '@/services/km-client';

export interface Question {
	id: string;
	text: string;
	options: string[];
	correctAnswer: string;
}

export interface GlobalState {
	controllerConnectionId: string;
	started: boolean;
	startTimestamp: number;
	players: Record<string, { name: string }>;

	// Bomb Game State
	bombHolderId: string | null;
	bombExplosionTime: number | null;
	currentFuseDuration: number;
	currentQuestion: Question | null;
	questionQueue: Question[];
	usedQuestionTexts: string[];
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
	controllerConnectionId: '',
	started: false,
	startTimestamp: 0,
	players: {},
	bombHolderId: null,
	bombExplosionTime: null,
	currentFuseDuration: 30000,
	currentQuestion: null,
	questionQueue: [],
	usedQuestionTexts: [],
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
