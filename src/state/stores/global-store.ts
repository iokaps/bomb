import { kmClient } from '@/services/km-client';

export interface GlobalState {
	controllerConnectionId: string;
	started: boolean;
	startTimestamp: number;
	players: Record<string, { name: string }>;
}

const initialState: GlobalState = {
	controllerConnectionId: '',
	started: false,
	startTimestamp: 0,
	players: {}
};

export const globalStore = kmClient.store<GlobalState>('global', initialState);
