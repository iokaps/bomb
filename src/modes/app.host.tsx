import { config } from '@/config';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { useGlobalController } from '@/hooks/useGlobalController';
import { useWakeLock } from '@/hooks/useWakeLock';
import { generateLink } from '@/kit/generate-link';
import { HostPresenterLayout } from '@/layouts/host-presenter';
import { kmClient } from '@/services/km-client';
import { gameActions } from '@/state/actions/game-actions';
import { globalStore, type GameMode } from '@/state/stores/global-store';
import { KmModalProvider, KmQrCode, useKmModal } from '@kokimoki/shared';
import { CircleHelp } from 'lucide-react';
import * as React from 'react';
import { useState } from 'react';
import Markdown from 'react-markdown';
import { useSnapshot } from 'valtio';

const GAME_MODE_DESCRIPTIONS: Record<GameMode, string> = {
	accelerating:
		'Fuse starts at 30s and gets shorter by 2s every pass (min 5s).',
	classic: "Global random timer (45-90s). Passing doesn't change the timer.",
	'shot-clock': 'Timer resets to 15s on every pass.',
	chaos: 'Fuse resets to a random duration (5-25s) on every pass.'
};

const HelpButton = () => {
	const { openDialog } = useKmModal();

	return (
		<button
			onClick={() =>
				openDialog({
					title: config.helpButtonLabel,
					description: 'Game instructions and rules',
					content: (
						<div className="prose prose-invert max-h-[60vh] max-w-none overflow-y-auto pr-2">
							<Markdown>{config.howToPlayMd}</Markdown>
						</div>
					),
					type: 'dialog'
				})
			}
			className="flex items-center gap-2 rounded-md border border-white/20 bg-transparent px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-white/10"
		>
			<CircleHelp size={18} />
			<span className="hidden sm:inline">{config.helpButtonLabel}</span>
		</button>
	);
};

const QueueStatus = () => {
	const { questionQueue } = useSnapshot(globalStore.proxy);
	if (questionQueue.length === 0) return null;
	return (
		<div className="text-sm font-medium text-green-400">
			{questionQueue.length} questions ready!
		</div>
	);
};

const FuseTimer = () => {
	const { started, bombExplosionTime } = useSnapshot(globalStore.proxy);
	const [timeLeft, setTimeLeft] = useState<number | null>(null);

	React.useEffect(() => {
		if (!started || !bombExplosionTime) {
			setTimeLeft(null);
			return;
		}

		const interval = setInterval(() => {
			const now = kmClient.serverTimestamp();
			const diff = Math.ceil((bombExplosionTime - now) / 1000);
			setTimeLeft(diff);
		}, 200);

		return () => clearInterval(interval);
	}, [started, bombExplosionTime]);

	if (timeLeft === null) return null;

	return (
		<div
			className={`font-mono text-2xl font-bold ${timeLeft <= 5 ? 'animate-pulse text-red-600' : 'text-game-text'}`}
		>
			{timeLeft > 0 ? `Explosion in: ${timeLeft}s` : `OVERDUE: ${timeLeft}s`}
		</div>
	);
};

const App: React.FC = () => {
	useGlobalController();
	useWakeLock();
	const { title } = config;
	useDocumentTitle(title);

	const { started, players, bombHolderId, winnerId } = useSnapshot(
		globalStore.proxy
	);
	const [theme, setTheme] = useState('General Knowledge');
	const [language, setLanguage] = useState('English');
	const [gameMode, setGameMode] = useState<GameMode>('accelerating');
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
		<KmModalProvider>
			<HostPresenterLayout.Root>
				<HostPresenterLayout.Header>
					<div className="flex items-center justify-between gap-4">
						<div className="text-sm opacity-70">{config.hostLabel}</div>
						<HelpButton />
					</div>
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
										<option value="Russian">Russian</option>
										<option value="Greek">Greek</option>
									</select>
								</div>
								<div>
									<label className="text-game-text-muted block text-sm font-medium">
										Game Mode
									</label>
									<select
										value={gameMode}
										onChange={(e) => setGameMode(e.target.value as GameMode)}
										className="bg-game-bg text-game-text focus:border-game-primary focus:ring-game-primary mt-1 block w-full rounded-md border border-white/20 p-2 shadow-sm sm:text-sm"
									>
										<option value="accelerating">Accelerating Fuse</option>
										<option value="classic">Classic (Hot Potato)</option>
										<option value="shot-clock">Shot Clock</option>
										<option value="chaos">Chaos Mode</option>
									</select>
									<div className="text-game-text-muted mt-1 text-xs">
										{GAME_MODE_DESCRIPTIONS[gameMode]}
									</div>
								</div>
								<div className="flex gap-2">
									<button
										onClick={async () => {
											setLoading(true);
											try {
												await gameActions.startGame(theme, language, gameMode);
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
								<QueueStatus />
								{winnerId && (
									<div className="text-xl font-bold text-green-400">
										Winner: {players[winnerId]?.name || winnerId}
									</div>
								)}
							</div>
						) : (
							<div className="flex flex-col gap-4">
								<div className="text-game-text text-lg">Game in progress!</div>
								<FuseTimer />
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
									{config.stopButton}
								</button>
							</div>
						)}
					</div>
				</HostPresenterLayout.Main>
			</HostPresenterLayout.Root>
		</KmModalProvider>
	);
};

export default App;
