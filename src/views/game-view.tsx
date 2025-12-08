import { kmClient } from '@/services/km-client';
import { gameActions } from '@/state/actions/game-actions';
import { globalStore } from '@/state/stores/global-store';
import { useKmAudioContext } from '@kokimoki/shared';
import { Bomb } from 'lucide-react';
import { useEffect } from 'react';
import { useSnapshot } from 'valtio';

export const GameView = () => {
	const { bombHolderId, currentQuestion, playerStatus, winnerId, players } =
		useSnapshot(globalStore.proxy);
	const { playAudio, stopAudio } = useKmAudioContext();

	const myId = kmClient.id;
	const isEliminated = playerStatus[myId] === 'eliminated';
	const hasBomb = bombHolderId === myId;

	useEffect(() => {
		if (hasBomb) {
			playAudio(
				'https://cdn.pixabay.com/audio/2022/03/10/audio_c8c8a73467.mp3',
				0.5,
				true
			);
		} else {
			stopAudio();
		}

		return () => {
			stopAudio();
		};
	}, [hasBomb, playAudio, stopAudio]);

	useEffect(() => {
		if (isEliminated) {
			playAudio(
				'https://cdn.pixabay.com/audio/2016/11/23/15/50/explosion-185296_1280.mp3',
				0.8
			);
		}
	}, [isEliminated, playAudio]);

	useEffect(() => {
		if (winnerId) {
			playAudio(
				'https://cdn.pixabay.com/audio/2021/08/04/audio_12b0c7443c.mp3',
				0.7
			);
		}
	}, [winnerId, playAudio]);

	if (winnerId) {
		return (
			<div className="text-game-text flex h-full flex-col items-center justify-center text-center">
				<h1 className="mb-4 animate-bounce text-4xl font-bold text-green-400">
					Game Over!
				</h1>
				<div className="text-2xl">
					Winner: <span className="font-bold">{players[winnerId]?.name}</span>
				</div>
			</div>
		);
	}

	if (isEliminated) {
		return (
			<div className="flex h-full flex-col items-center justify-center rounded-lg border border-red-500/20 bg-red-900/20 p-8 text-center">
				<h1 className="mb-4 text-4xl font-bold text-red-500">ELIMINATED</h1>
				<p className="text-red-200/70">Better luck next time!</p>
			</div>
		);
	}

	if (hasBomb) {
		return (
			<div className="mx-auto flex w-full max-w-md flex-col gap-6">
				<div className="flex animate-pulse flex-col items-center gap-2 rounded-lg bg-red-600 p-6 text-center text-white shadow-[0_0_30px_rgba(220,38,38,0.5)]">
					<Bomb size={64} />
					<h2 className="text-2xl font-bold">YOU HAVE THE BOMB!</h2>
					<p className="font-medium opacity-90">Answer quickly!</p>
				</div>

				{currentQuestion ? (
					<div className="bg-game-surface rounded-lg border border-white/10 p-6 shadow-xl">
						<h3 className="text-game-text mb-6 text-xl font-semibold">
							{currentQuestion.text}
						</h3>
						<div className="grid grid-cols-1 gap-3">
							{currentQuestion.options.map((option, idx) => (
								<button
									key={idx}
									onClick={() => {
										playAudio(
											'https://cdn.pixabay.com/audio/2022/03/15/audio_18d699d538.mp3',
											0.5
										);
										gameActions.submitAnswer(currentQuestion.id, option);
									}}
									className="text-game-text hover:border-game-primary rounded-lg border border-white/10 bg-white/5 p-4 text-left transition-all hover:bg-white/10 active:bg-white/20"
								>
									{option}
								</button>
							))}
						</div>
					</div>
				) : (
					<div className="text-game-text-muted animate-pulse text-center">
						Loading question...
					</div>
				)}
			</div>
		);
	}

	return (
		<div className="flex h-full flex-col items-center justify-center text-center">
			<h2 className="mb-4 text-3xl font-bold text-green-400">SAFE</h2>
			<p className="text-game-text-muted text-lg">Wait for your turn...</p>
			<div className="bg-game-surface mt-12 flex flex-col items-center gap-4 rounded-lg border border-white/10 p-6">
				<div className="text-game-text flex items-center gap-3">
					<Bomb className="animate-pulse text-red-500" size={24} />
					<span>Bomb is with:</span>
				</div>
				<div className="animate-pulse text-2xl font-bold text-red-500">
					{players[bombHolderId!]?.name}
				</div>
			</div>
		</div>
	);
};
