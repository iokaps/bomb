import { kmClient } from '@/services/km-client';
import { useEffect, useRef, useState } from 'react';

export function useServerTimer(ms = 250) {
	const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
	const [serverTime, setServerTime] = useState(() =>
		kmClient.serverTimestamp()
	);

	useEffect(() => {
		intervalRef.current = setInterval(
			() => setServerTime(kmClient.serverTimestamp()),
			ms
		);

		return () => {
			if (intervalRef.current) {
				clearInterval(intervalRef.current);
				intervalRef.current = null;
			}
		};
	}, [ms]);

	return serverTime;
}
