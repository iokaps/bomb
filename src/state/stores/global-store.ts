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
	currentQuestion: Question | null;
	questionQueue: Question[];
	usedQuestionIds: string[];
	playerStatus: Record<string, 'alive' | 'eliminated'>;
	winnerId: string | null;

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
	currentQuestion: null,
	questionQueue: [],
	usedQuestionIds: [],
	playerStatus: {},
	winnerId: null,

	gameSettings: {
		theme: 'General Knowledge',
		difficulty: 1,
		language: 'English'
	}
};

export const globalStore = kmClient.store<GlobalState>('global', initialState);
