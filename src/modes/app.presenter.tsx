import { config } from '@/config';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { useGlobalController } from '@/hooks/useGlobalController';
import { generateLink } from '@/kit/generate-link';
import { HostPresenterLayout } from '@/layouts/host-presenter';
import { kmClient } from '@/services/km-client';
import { globalStore } from '@/state/stores/global-store';
import { KmQrCode } from '@kokimoki/shared';
import * as React from 'react';
import { useSnapshot } from 'valtio';

const App: React.FC = () => {
	const { title } = config;
	const { started, players, bombHolderId, playerStatus, winnerId } =
		useSnapshot(globalStore.proxy);

	useGlobalController();
	useDocumentTitle(title);

	if (kmClient.clientContext.mode !== 'presenter') {
		throw new Error('App presenter rendered in non-presenter mode');
	}

	const playerLink = generateLink(kmClient.clientContext.playerCode, {
		mode: 'player'
	});

	return (
		<HostPresenterLayout.Root>
			<HostPresenterLayout.Header>
				<div className="text-sm opacity-70">{config.presenterLabel}</div>
			</HostPresenterLayout.Header>

			<HostPresenterLayout.Main>
				<div className="rounded-lg border border-gray-200 bg-white shadow-md">
					<div className="flex flex-col gap-2 p-6">
						<h2 className="text-xl font-bold">{config.playerLinkLabel}</h2>
						<KmQrCode data={playerLink} size={200} interactive={false} />

						<a
							href={playerLink}
							target="_blank"
							rel="noreferrer"
							className="break-all text-blue-600 underline hover:text-blue-700"
						>
							{config.playerLinkLabel}
						</a>
					</div>
				</div>

				<div className="grid grid-cols-1 gap-6">
					<div className="rounded-lg border border-gray-200 bg-white p-6 shadow-md">
						<h2 className="mb-4 text-xl font-bold">Players</h2>
						<div className="flex flex-wrap gap-2">
							{Object.entries(players).map(([id, player]) => {
								const isBombHolder = id === bombHolderId;
								const isEliminated = playerStatus[id] === 'eliminated';
								const isWinner = id === winnerId;

								let className = 'p-3 rounded border ';
								if (isWinner)
									className +=
										'bg-green-100 border-green-500 text-green-800 font-bold';
								else if (isBombHolder)
									className +=
										'bg-red-500 text-white border-red-600 animate-pulse font-bold';
								else if (isEliminated)
									className +=
										'bg-gray-100 text-gray-400 border-gray-200 line-through';
								else className += 'bg-white border-gray-200';

								return (
									<div key={id} className={className}>
										{player.name}
										{isBombHolder && ' 💣'}
										{isWinner && ' 👑'}
									</div>
								);
							})}
							{Object.keys(players).length === 0 && (
								<div className="text-gray-500 italic">
									Waiting for players to join...
								</div>
							)}
						</div>
					</div>

					{started && (
						<div className="rounded-lg border border-gray-200 bg-white p-6 shadow-md">
							<h2 className="mb-4 text-xl font-bold">Game Status</h2>
							{winnerId ? (
								<div className="text-3xl font-bold text-green-600">
									Winner: {players[winnerId]?.name}
								</div>
							) : (
								<div className="text-xl">Bomb is ticking...</div>
							)}
						</div>
					)}
				</div>
			</HostPresenterLayout.Main>
		</HostPresenterLayout.Root>
	);
};

export default App;
