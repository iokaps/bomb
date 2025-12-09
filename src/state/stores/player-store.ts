import { kmClient } from '@/services/km-client';

export interface PlayerState {
	name: string;
	currentView: 'lobby' | 'game' | 'eliminated' | 'winner';
	lastAnsweredQuestionId: string | null;
	selectedOption: string | null;
	hasPhoto: boolean;
}

const initialState: PlayerState = {
	name: '',
	currentView: 'lobby',
	lastAnsweredQuestionId: null,
	selectedOption: null,
	hasPhoto: false
};

export const playerStore = kmClient.localStore<PlayerState>(
	'player',
	initialState
);
