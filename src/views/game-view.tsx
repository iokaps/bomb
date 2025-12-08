import { kmClient } from '@/services/km-client';
import { gameActions } from '@/state/actions/game-actions';
import { globalStore } from '@/state/stores/global-store';
import { useSnapshot } from 'valtio';

export const GameView = () => {
	const { bombHolderId, currentQuestion, playerStatus, winnerId, players } =
		useSnapshot(globalStore.proxy);

	const myId = kmClient.id;
	const isEliminated = playerStatus[myId] === 'eliminated';
	const hasBomb = bombHolderId === myId;

	if (winnerId) {
		return (
			<div className="flex h-full flex-col items-center justify-center text-center">
				<h1 className="mb-4 text-4xl font-bold">Game Over!</h1>
				<div className="text-2xl">Winner: {players[winnerId]?.name}</div>
			</div>
		);
	}

	if (isEliminated) {
		return (
			<div className="flex h-full flex-col items-center justify-center rounded-lg bg-red-100 p-8 text-center">
				<h1 className="mb-4 text-4xl font-bold text-red-600">ELIMINATED</h1>
				<p>Better luck next time!</p>
			</div>
		);
	}

	if (hasBomb) {
		return (
			<div className="mx-auto flex w-full max-w-md flex-col gap-6">
				<div className="animate-pulse rounded-lg bg-red-500 p-4 text-center text-white">
					<h2 className="text-2xl font-bold">YOU HAVE THE BOMB!</h2>
					<p>Answer quickly!</p>
				</div>

				{currentQuestion ? (
					<div className="rounded-lg bg-white p-6 shadow-md">
						<h3 className="mb-4 text-xl font-semibold">
							{currentQuestion.text}
						</h3>
						<div className="grid grid-cols-1 gap-3">
							{currentQuestion.options.map((option, idx) => (
								<button
									key={idx}
									onClick={() =>
										gameActions.submitAnswer(currentQuestion.id, option)
									}
									className="rounded border border-blue-200 bg-blue-50 p-3 text-left transition-colors hover:bg-blue-100 active:bg-blue-200"
								>
									{option}
								</button>
							))}
						</div>
					</div>
				) : (
					<div className="text-center">Loading question...</div>
				)}
			</div>
		);
	}

	return (
		<div className="flex h-full flex-col items-center justify-center text-center">
			<h2 className="mb-4 text-2xl font-bold text-green-600">SAFE</h2>
			<p>Wait for your turn...</p>
			<div className="mt-8">
				Bomb is with: <strong>{players[bombHolderId!]?.name}</strong>
			</div>
		</div>
	);
};
