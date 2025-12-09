import { useEffect } from 'react';

export function useWakeLock() {
	useEffect(() => {
		let wakeLock: any = null;

		const requestWakeLock = async () => {
			try {
				if ('wakeLock' in navigator) {
					wakeLock = await (navigator as any).wakeLock.request('screen');
				}
			} catch (err) {
				// Ignore errors (e.g. if battery is low or not supported)
				console.debug('Wake Lock error:', err);
			}
		};

		requestWakeLock();

		const handleVisibilityChange = () => {
			if (document.visibilityState === 'visible') {
				requestWakeLock();
			}
		};

		document.addEventListener('visibilitychange', handleVisibilityChange);

		return () => {
			document.removeEventListener('visibilitychange', handleVisibilityChange);
			if (wakeLock) {
				wakeLock.release();
				wakeLock = null;
			}
		};
	}, []);
}
