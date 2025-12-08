import { kmClient } from '@/services/km-client';
import type { KokimokiStore } from '@kokimoki/app';
import { useEffect, useState } from 'react';

interface StoreEntry {
	store: KokimokiStore<object>;
	refCount: number;
	joined: boolean;
	cleanupTimeout?: ReturnType<typeof setTimeout>;
}

const kokimokiStores = new Map<string, StoreEntry>();

export interface UseDynamicStoreResult<T extends object> {
	store: KokimokiStore<T>;
	isConnected: boolean;
	isConnecting: boolean;
}

interface ConnectionState {
	connected: boolean;
	connecting: boolean;
}

export function useDynamicStore<T extends object>(
	roomName: string,
	initialState: T
): UseDynamicStoreResult<T> {
	const [connection, setConnection] = useState<ConnectionState>({
		connected: false,
		connecting: false
	});

	// Initialize or get cached store
	if (!kokimokiStores.has(roomName)) {
		const store = kmClient.store<T>(roomName, initialState, false);
		kokimokiStores.set(roomName, { store, refCount: 0, joined: false });
	}

	const entry = kokimokiStores.get(roomName)!;
	const store = entry.store as KokimokiStore<T>;

	useEffect(() => {
		// Cancel any pending cleanup (handles React Strict Mode double-mounting)
		if (entry.cleanupTimeout) {
			clearTimeout(entry.cleanupTimeout);
			entry.cleanupTimeout = undefined;
		}

		// Increment reference count
		entry.refCount += 1;

		// Join store if not already joined
		if (!entry.joined) {
			entry.joined = true;
			setConnection({
				connecting: true,
				connected: false
			});

			kmClient
				.join(entry.store)
				.then(() => {
					// Only update state if component is still mounted
					if (entry.refCount > 0) {
						setConnection({
							connecting: false,
							connected: true
						});
					}
				})
				.catch((error) => {
					console.error(`Failed to join store ${roomName}:`, error);
					setConnection({
						connecting: false,
						connected: false
					});
					entry.joined = false;
				});
		} else {
			// Already joined by another instance
			setConnection({
				connecting: false,
				connected: true
			});
		}

		// Cleanup on unmount
		return () => {
			const cleanupEntry = kokimokiStores.get(roomName);
			if (!cleanupEntry) return;

			// Decrement reference count
			cleanupEntry.refCount -= 1;

			// Schedule cleanup with debounce to handle React Strict Mode
			if (cleanupEntry.refCount <= 0) {
				cleanupEntry.cleanupTimeout = setTimeout(async () => {
					// Double-check refCount in case component remounted during timeout
					if (cleanupEntry.refCount > 0) return;

					// Leave store if joined
					if (cleanupEntry.joined) {
						cleanupEntry.joined = false;
						try {
							await kmClient.leave(cleanupEntry.store);
						} catch (error) {
							// Suppress expected "Room not joined" errors
							if (
								error instanceof Error &&
								!error.message?.includes('Room not joined')
							) {
								console.error(`Failed to leave store ${roomName}:`, error);
							}
						}
					}

					// Remove from cache
					kokimokiStores.delete(roomName);
				}, 250);
			}

			setConnection({
				connecting: false,
				connected: false
			});
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [roomName]);

	return {
		store,
		isConnected: connection.connected,
		isConnecting: connection.connecting
	};
}
