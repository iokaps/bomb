import { kmClient } from '@/services/km-client';
import { gameActions } from '@/state/actions/game-actions';
import { globalStore } from '@/state/stores/global-store';
import { useEffect, useRef } from 'react';
import { useSnapshot } from 'valtio';

export function useGlobalController() {
	// Only the host should control the global logic
	if (kmClient.clientContext.mode !== 'host') {
		return false;
	}

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
			// If I am the controller, log it once
			if (controllerConnectionId === kmClient.connectionId) {
				// console.log('I am the global controller');
			}
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

		console.log('Starting global controller loop');

		// Separate interval for queue management to avoid blocking the explosion timer
		const queueInterval = setInterval(() => {
			// Use snapshot to avoid proxy overhead
			const { started } = globalStore.proxy;
			if (started) {
				// Run checkQueue in a non-blocking way
				setTimeout(() => {
					gameActions.checkQueue();
				}, 0);
			}
		}, 2000);

		// Use a Web Worker for the game loop to prevent throttling when tab is in background
		const workerCode = `
			let intervalId;
			self.onmessage = function(e) {
				if (e.data === 'start') {
					intervalId = setInterval(() => {
						self.postMessage('tick');
					}, 1000);
				} else if (e.data === 'stop') {
					clearInterval(intervalId);
				}
			};
		`;
		const blob = new Blob([workerCode], { type: 'application/javascript' });
		const workerUrl = URL.createObjectURL(blob);
		const worker = new Worker(workerUrl);

		worker.onmessage = () => {
			const serverTime = kmClient.serverTimestamp();
			const { started, bombExplosionTime } = globalStore.proxy;

			// Log every 5 seconds to prove loop is alive
			if (started && serverTime % 5000 < 1000) {
				console.log('Controller heartbeat', {
					serverTime,
					bombExplosionTime,
					diff: bombExplosionTime ? bombExplosionTime - serverTime : 'N/A'
				});
			}

			// Add 500ms buffer to prevent premature triggering or race conditions
			if (started && bombExplosionTime && serverTime >= bombExplosionTime) {
				// Safety valve: If overdue by more than 10 seconds, force unlock
				// This handles cases where the previous attempt hung indefinitely
				if (
					isHandlingExplosion.current &&
					serverTime - bombExplosionTime > 10000
				) {
					console.error(
						'Explosion handling stuck for >10s. Forcing unlock and retry.'
					);
					isHandlingExplosion.current = false;
				}

				if (isHandlingExplosion.current) {
					console.warn('Explosion handling skipped: Lock is busy');
					return;
				}

				console.log('Explosion triggered!', {
					serverTime,
					bombExplosionTime,
					diff: serverTime - bombExplosionTime
				});

				isHandlingExplosion.current = true;

				// Add a timeout race to ensure we don't hang forever
				const timeoutPromise = new Promise((_, reject) =>
					setTimeout(
						() => reject(new Error('Explosion handling timed out')),
						5000
					)
				);

				Promise.race([gameActions.handleExplosion(), timeoutPromise])
					.catch((err) => {
						console.error('Explosion handling failed:', err);
					})
					.finally(() => {
						console.log('Explosion handling completed');
						isHandlingExplosion.current = false;
					});
			}
		};

		worker.postMessage('start');

		return () => {
			worker.postMessage('stop');
			worker.terminate();
			URL.revokeObjectURL(workerUrl);
			clearInterval(queueInterval);
		};
	}, [isGlobalController]);

	return isGlobalController;
}
