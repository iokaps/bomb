import { kmClient } from '@/services/km-client';
import { gameActions } from '@/state/actions/game-actions';
import { globalStore } from '@/state/stores/global-store';
import { playerStore } from '@/state/stores/player-store';
import { cn } from '@/utils/cn';
import { Bomb } from 'lucide-react';
import { useEffect } from 'react';
import { useSnapshot } from 'valtio';

export const GameView = () => {
	const { bombHolderId, currentQuestion, playerStatus, winnerId, players } =
		useSnapshot(globalStore.proxy);
	const { selectedOption } = useSnapshot(playerStore.proxy);

	const myId = kmClient.id;
	const isEliminated = playerStatus[myId] === 'eliminated';
	const hasBomb = bombHolderId === myId;

	useEffect(() => {
		// Safety net: Clear selection when question changes
		// This ensures that if the game moves on, the player isn't stuck with a selection
		kmClient.transact([playerStore], ([state]) => {
			state.selectedOption = null;
		});
	}, [currentQuestion?.id]);

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
							{currentQuestion.options.map((option, idx) => {
								const isSelected = selectedOption === option;
								return (
									<button
										key={idx}
										disabled={!!selectedOption}
										onClick={() => {
											// Set selected option locally first
											kmClient.transact([playerStore], ([state]) => {
												state.selectedOption = option;
											});
											gameActions
												.submitAnswer(currentQuestion.id, option)
												.catch(() => {
													// Reset selection on error
													kmClient.transact([playerStore], ([state]) => {
														state.selectedOption = null;
													});
												});
										}}
										className={cn(
											'text-game-text rounded-lg border p-4 text-left transition-all',
											isSelected
												? 'border-game-primary bg-game-primary/20 ring-game-primary ring-2'
												: 'hover:border-game-primary border-white/10 bg-white/5 hover:bg-white/10 active:bg-white/20',
											!!selectedOption && !isSelected && 'opacity-50'
										)}
									>
										{option}
									</button>
								);
							})}
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
