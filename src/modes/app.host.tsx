import { config } from '@/config';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { useGlobalController } from '@/hooks/useGlobalController';
import { generateLink } from '@/kit/generate-link';
import { HostPresenterLayout } from '@/layouts/host-presenter';
import { kmClient } from '@/services/km-client';
import { gameActions } from '@/state/actions/game-actions';
import { globalStore } from '@/state/stores/global-store';
import { KmQrCode } from '@kokimoki/shared';
import * as React from 'react';
import { useState } from 'react';
import { useSnapshot } from 'valtio';

const App: React.FC = () => {
	useGlobalController();
	const { title } = config;
	useDocumentTitle(title);

	const { started, players, bombHolderId, winnerId } = useSnapshot(
		globalStore.proxy
	);
	const [theme, setTheme] = useState('General Knowledge');
	const [language, setLanguage] = useState('English');
	const [loading, setLoading] = useState(false);

	if (kmClient.clientContext.mode !== 'host') {
		throw new Error('App host rendered in non-host mode');
	}

	const playerLink = generateLink(kmClient.clientContext.playerCode, {
		mode: 'player'
	});

	const presenterLink = generateLink(kmClient.clientContext.presenterCode, {
		mode: 'presenter',
		playerCode: kmClient.clientContext.playerCode
	});

	return (
		<HostPresenterLayout.Root>
			<HostPresenterLayout.Header>
				<div className="text-sm opacity-70">{config.hostLabel}</div>
			</HostPresenterLayout.Header>

			<HostPresenterLayout.Main>
				<div className="rounded-lg border border-gray-200 bg-white shadow-md">
					<div className="flex flex-col gap-2 p-6">
						<h2 className="text-xl font-bold">{config.gameLinksTitle}</h2>
						<KmQrCode data={playerLink} size={200} interactive={false} />
						<div className="flex gap-2">
							<a
								href={playerLink}
								target="_blank"
								rel="noreferrer"
								className="break-all text-blue-600 underline hover:text-blue-700"
							>
								{config.playerLinkLabel}
							</a>
							|
							<a
								href={presenterLink}
								target="_blank"
								rel="noreferrer"
								className="break-all text-blue-600 underline hover:text-blue-700"
							>
								{config.presenterLinkLabel}
							</a>
						</div>
					</div>
				</div>

				<div className="rounded-lg border border-gray-200 bg-white p-6 shadow-md">
					<h2 className="mb-4 text-xl font-bold">Game Controls</h2>
					{!started ? (
						<div className="flex flex-col gap-4">
							<div>
								<label className="block text-sm font-medium text-gray-700">
									Theme
								</label>
								<input
									type="text"
									value={theme}
									onChange={(e) => setTheme(e.target.value)}
									className="mt-1 block w-full rounded-md border border-gray-300 p-2 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
								/>
							</div>
							<div>
								<label className="block text-sm font-medium text-gray-700">
									Language
								</label>
								<select
									value={language}
									onChange={(e) => setLanguage(e.target.value)}
									className="mt-1 block w-full rounded-md border border-gray-300 p-2 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
								>
									<option value="English">English</option>
									<option value="Spanish">Spanish</option>
									<option value="French">French</option>
									<option value="German">German</option>
									<option value="Italian">Italian</option>
									<option value="Portuguese">Portuguese</option>
									<option value="Japanese">Japanese</option>
									<option value="Korean">Korean</option>
									<option value="Chinese">Chinese</option>
									<option value="Russian">Russian</option>
									<option value="Greek">Greek</option>
								</select>
							</div>
							<button
								onClick={async () => {
									setLoading(true);
									try {
										await gameActions.startGame(theme, language);
									} finally {
										setLoading(false);
									}
								}}
								className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
								disabled={Object.keys(players).length < 2 || loading}
							>
								{loading ? 'Starting...' : 'Start Game'}
								{!loading &&
									Object.keys(players).length < 2 &&
									' (Need 2+ players)'}
							</button>
							{winnerId && (
								<div className="text-xl font-bold text-green-600">
									Winner: {players[winnerId]?.name || winnerId}
								</div>
							)}
						</div>
					) : (
						<div className="flex flex-col gap-4">
							<div className="text-lg">Game in progress!</div>
							<div>
								Bomb Holder:{' '}
								<strong className="text-red-600">
									{players[bombHolderId!]?.name || 'Unknown'}
								</strong>
							</div>
							<button
								onClick={() => gameActions.stopGame()}
								className="rounded bg-red-600 px-4 py-2 text-white hover:bg-red-700"
							>
								Stop Game
							</button>
						</div>
					)}
				</div>
			</HostPresenterLayout.Main>
		</HostPresenterLayout.Root>
	);
};

export default App;
