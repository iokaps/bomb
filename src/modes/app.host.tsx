import { config } from '@/config';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { useGlobalController } from '@/hooks/useGlobalController';
import { generateLink } from '@/kit/generate-link';
import { HostPresenterLayout } from '@/layouts/host-presenter';
import { kmClient } from '@/services/km-client';
import { gameActions } from '@/state/actions/game-actions';
import { globalStore } from '@/state/stores/global-store';
import { KmQrCode, useKmAudioContext } from '@kokimoki/shared';
import * as React from 'react';
import { useState } from 'react';
import { useSnapshot } from 'valtio';

const App: React.FC = () => {
	useGlobalController();
	const { title } = config;
	useDocumentTitle(title);
	const { playAudio } = useKmAudioContext();

	const { started, players, bombHolderId, winnerId, questionQueue } =
		useSnapshot(globalStore.proxy);
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
				<div className="bg-game-surface rounded-lg border border-white/10 shadow-xl">
					<div className="flex flex-col gap-2 p-6">
						<h2 className="text-game-text text-xl font-bold">
							{config.gameLinksTitle}
						</h2>
						<div className="w-fit rounded-lg bg-white p-4">
							<KmQrCode data={playerLink} size={200} interactive={false} />
						</div>
						<div className="flex gap-2 text-sm">
							<a
								href={playerLink}
								target="_blank"
								rel="noreferrer"
								className="text-game-primary hover:text-game-accent break-all underline"
							>
								{config.playerLinkLabel}
							</a>
							<span className="text-game-text-muted">|</span>
							<a
								href={presenterLink}
								target="_blank"
								rel="noreferrer"
								className="text-game-primary hover:text-game-accent break-all underline"
							>
								{config.presenterLinkLabel}
							</a>
						</div>
					</div>
				</div>

				<div className="bg-game-surface rounded-lg border border-white/10 p-6 shadow-xl">
					<h2 className="text-game-text mb-4 text-xl font-bold">
						Game Controls
					</h2>
					{!started ? (
						<div className="flex flex-col gap-4">
							<div>
								<label className="text-game-text-muted block text-sm font-medium">
									Theme
								</label>
								<input
									type="text"
									value={theme}
									onChange={(e) => setTheme(e.target.value)}
									className="bg-game-bg text-game-text focus:border-game-primary focus:ring-game-primary mt-1 block w-full rounded-md border border-white/20 p-2 shadow-sm sm:text-sm"
								/>
							</div>
							<div>
								<label className="text-game-text-muted block text-sm font-medium">
									Language
								</label>
								<select
									value={language}
									onChange={(e) => setLanguage(e.target.value)}
									className="bg-game-bg text-game-text focus:border-game-primary focus:ring-game-primary mt-1 block w-full rounded-md border border-white/20 p-2 shadow-sm sm:text-sm"
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
							<div className="flex gap-2">
								<button
									onClick={async () => {
										setLoading(true);
										try {
											try {
												playAudio(
													'https://cdn.pixabay.com/audio/2022/03/15/audio_18d699d538.mp3',
													0.5
												);
											} catch (e) {
												console.warn('Audio play failed', e);
											}
											await gameActions.startGame(theme, language);
										} finally {
											setLoading(false);
										}
									}}
									className="bg-game-primary flex-1 rounded px-4 py-2 font-medium text-white transition-colors hover:bg-indigo-600 disabled:opacity-50"
									disabled={Object.keys(players).length < 2 || loading}
								>
									{loading ? 'Starting...' : 'Start Game'}
									{!loading &&
										Object.keys(players).length < 2 &&
										' (Need 2+ players)'}
								</button>
							</div>
							{questionQueue.length > 0 && (
								<div className="text-sm font-medium text-green-400">
									{questionQueue.length} questions ready!
								</div>
							)}
							{winnerId && (
								<div className="text-xl font-bold text-green-400">
									Winner: {players[winnerId]?.name || winnerId}
								</div>
							)}
						</div>
					) : (
						<div className="flex flex-col gap-4">
							<div className="text-game-text text-lg">Game in progress!</div>
							<div className="text-game-text">
								Bomb Holder:{' '}
								<strong className="animate-pulse text-red-500">
									{players[bombHolderId!]?.name || 'Unknown'}
								</strong>
							</div>
							<button
								onClick={() => gameActions.stopGame()}
								className="rounded bg-red-600 px-4 py-2 font-medium text-white transition-colors hover:bg-red-700"
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
