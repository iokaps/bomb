import { config } from '@/config';
import { kmClient } from '@/services/km-client';
import { globalStore } from '../stores/global-store';
import { playerStore, type PlayerState } from '../stores/player-store';

export const playerActions = {
	async setCurrentView(view: PlayerState['currentView']) {
		await kmClient.transact([playerStore], ([playerState]) => {
			playerState.currentView = view;
		});
	},

	async setPlayerName(name: string) {
		await kmClient.transact(
			[playerStore, globalStore],
			([playerState, globalState]) => {
				const alreadyJoined = Boolean(globalState.players[kmClient.id]);
				const currentPlayerCount = Object.keys(globalState.players).length;
				if (!alreadyJoined && currentPlayerCount >= config.maxPlayers) {
					throw new Error(config.playerLobbyFullError);
				}

				playerState.name = name;
				globalState.players[kmClient.id] = { name };
			}
		);
	},

	async setPlayerPhoto(photoUrl: string) {
		await kmClient.transact(
			[playerStore, globalStore],
			([playerState, globalState]) => {
				playerState.hasPhoto = true;
				if (globalState.players[kmClient.id]) {
					globalState.players[kmClient.id].photoUrl = photoUrl;
				}
			}
		);
	}
};
