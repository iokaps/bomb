import { globalStore } from '@/state/stores/global-store';
import { useEffect, useRef } from 'react';
import { useSnapshot } from 'valtio';

export const ExplosionSound = () => {
	const { playerStatus, started } = useSnapshot(globalStore.proxy);
	const prevEliminatedCount = useRef(0);

	useEffect(() => {
		if (!started) {
			prevEliminatedCount.current = 0;
			return;
		}

		const eliminatedCount = Object.values(playerStatus).filter(
			(s) => s === 'eliminated'
		).length;

		if (eliminatedCount > prevEliminatedCount.current) {
			playExplosion();
		}
		prevEliminatedCount.current = eliminatedCount;
	}, [playerStatus, started]);

	const playExplosion = () => {
		const ctx = new (window.AudioContext ||
			(window as any).webkitAudioContext)();

		// Create noise buffer
		const bufferSize = ctx.sampleRate * 2; // 2 seconds
		const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
		const data = buffer.getChannelData(0);
		for (let i = 0; i < bufferSize; i++) {
			data[i] = Math.random() * 2 - 1;
		}

		const noise = ctx.createBufferSource();
		noise.buffer = buffer;

		const noiseFilter = ctx.createBiquadFilter();
		noiseFilter.type = 'lowpass';
		noiseFilter.frequency.value = 1000;

		const noiseEnvelope = ctx.createGain();
		noiseEnvelope.gain.setValueAtTime(1, ctx.currentTime);
		noiseEnvelope.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 1);

		noise.connect(noiseFilter);
		noiseFilter.connect(noiseEnvelope);
		noiseEnvelope.connect(ctx.destination);

		noise.start();

		// Add a low boom
		const osc = ctx.createOscillator();
		osc.type = 'sine';
		osc.frequency.setValueAtTime(100, ctx.currentTime);
		osc.frequency.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);

		const oscGain = ctx.createGain();
		oscGain.gain.setValueAtTime(1, ctx.currentTime);
		oscGain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);

		osc.connect(oscGain);
		oscGain.connect(ctx.destination);

		osc.start();
	};

	return null;
};
