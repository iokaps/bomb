import { kmClient } from '@/services/km-client';
import { gameActions } from '@/state/actions/game-actions';
import { globalStore } from '@/state/stores/global-store';
import { useEffect, useRef } from 'react';
import { useSnapshot } from 'valtio';

// Module-level refs to prevent issues with React Strict Mode double-mounting
let activeWorker: Worker | null = null;
let isHandlingExplosion = false;

export function useGlobalController() {
	// Only the host should control the global logic
	if (kmClient.clientContext.mode !== 'host') {
		return false;
	}

	const { controllerClientId, hostClientIds } = useSnapshot(globalStore.proxy);
	const connections = useSnapshot(globalStore.connections);
	const clientIds = connections.clientIds;
	const isGlobalController = controllerClientId === kmClient.id;
	const isElecting = useRef(false);
	const isRegistering = useRef(false);

	// Register this host client when mounting
	useEffect(() => {
		if (isRegistering.current) return;
		if (hostClientIds.includes(kmClient.id)) return;

		isRegistering.current = true;
		kmClient
			.transact([globalStore], ([globalState]) => {
				if (!globalState.hostClientIds.includes(kmClient.id)) {
					globalState.hostClientIds.push(kmClient.id);
				}
			})
			.then(() => {
				console.log('Host registered:', kmClient.id);
			})
			.finally(() => {
				isRegistering.current = false;
			});
	}, [hostClientIds]);

	// Clean up offline hosts and elect new controller
	useEffect(() => {
		// Wait for connections to be established
		if (clientIds.size === 0) return;

		// Get online hosts only
		const onlineHosts = hostClientIds.filter((id) => clientIds.has(id));

		// Check if global controller is an online host
		if (onlineHosts.includes(controllerClientId)) {
			return;
		}

		// Prevent multiple simultaneous elections
		if (isElecting.current) return;

		console.log('Electing new global controller from hosts...');
		isElecting.current = true;

		// Select new controller from online hosts, sorting by client id
		kmClient
			.transact([globalStore], ([globalState]) => {
				// Filter to only online hosts
				const onlineHostIds = globalState.hostClientIds.filter((id) =>
					clientIds.has(id)
				);
				onlineHostIds.sort();

				// Update the hostClientIds to remove offline hosts
				globalState.hostClientIds = onlineHostIds;

				// Elect from online hosts only
				globalState.controllerClientId = onlineHostIds[0] || '';
			})
			.then(() => {
				console.log(
					'New global controller elected:',
					globalStore.proxy.controllerClientId
				);
			})
			.catch((err) => {
				console.error('Failed to elect global controller', err);
			})
			.finally(() => {
				isElecting.current = false;
			});
	}, [clientIds, controllerClientId, hostClientIds]);

	// Run global controller-specific logic
	useEffect(() => {
		console.log('Controller effect:', {
			isGlobalController,
			controllerClientId,
			myClientId: kmClient.id,
			match: controllerClientId === kmClient.id
		});

		if (!isGlobalController) {
			return;
		}

		// If there's already an active worker, don't create another one
		if (activeWorker) {
			console.log('Worker already active, skipping');
			return;
		}

		console.log('Starting global controller loop');

		// Reset handling flag when starting new loop
		isHandlingExplosion = false;

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
		activeWorker = worker;

		worker.onmessage = () => {
			const serverTime = kmClient.serverTimestamp();
			const { started, bombExplosionTime } = globalStore.proxy;

			if (started && bombExplosionTime && serverTime >= bombExplosionTime) {
				// Safety valve: If overdue by more than 10 seconds, force unlock
				if (isHandlingExplosion && serverTime - bombExplosionTime > 10000) {
					console.error('Explosion handling stuck. Forcing unlock.');
					isHandlingExplosion = false;
				}

				if (isHandlingExplosion) {
					return;
				}

				isHandlingExplosion = true;

				gameActions
					.handleExplosion()
					.catch((err) => {
						console.error('Explosion handling failed:', err);
					})
					.finally(() => {
						isHandlingExplosion = false;
					});
			}
		};

		worker.postMessage('start');

		return () => {
			worker.postMessage('stop');
			worker.terminate();
			URL.revokeObjectURL(workerUrl);
			activeWorker = null;
		};
	}, [isGlobalController]);

	return isGlobalController;
}
