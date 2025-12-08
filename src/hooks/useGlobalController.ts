import { kmClient } from '@/services/km-client';
import { gameActions } from '@/state/actions/game-actions';
import { globalStore } from '@/state/stores/global-store';
import { useEffect, useRef } from 'react';
import { useSnapshot } from 'valtio';

export function useGlobalController() {
	const { controllerConnectionId } = useSnapshot(globalStore.proxy);
	const connections = useSnapshot(globalStore.connections);
	const connectionIds = connections.connectionIds;
	const isGlobalController = controllerConnectionId === kmClient.connectionId;
	const isHandlingExplosion = useRef(false);

	// Maintain connection that is assigned to be the global controller
	useEffect(() => {
		// Wait for connections to be established
		if (connectionIds.size === 0) return;

		// Check if global controller is online
		if (connectionIds.has(controllerConnectionId)) {
			return;
		}

		console.log('Electing new global controller...');

		// Select new host, sorting by connection id
		kmClient
			.transact([globalStore], ([globalState]) => {
				const connectionIdsArray = Array.from(connectionIds);
				connectionIdsArray.sort();
				globalState.controllerConnectionId = connectionIdsArray[0] || '';
			})
			.then(() => {
				console.log('New global controller elected');
			})
			.catch((err) => {
				console.error('Failed to elect global controller', err);
			});
	}, [connectionIds, controllerConnectionId]);

	// Run global controller-specific logic
	useEffect(() => {
		if (!isGlobalController) {
			return;
		}

		const interval = setInterval(() => {
			const serverTime = kmClient.serverTimestamp();
			const { started, bombExplosionTime } = globalStore.proxy;

			// Check queue health
			if (started) {
				gameActions.checkQueue();
			}

			if (started && bombExplosionTime && serverTime >= bombExplosionTime) {
				if (isHandlingExplosion.current) return;

				isHandlingExplosion.current = true;
				gameActions.handleExplosion().finally(() => {
					isHandlingExplosion.current = false;
				});
			}
		}, 1000);

		return () => clearInterval(interval);
	}, [isGlobalController]);

	return isGlobalController;
}
