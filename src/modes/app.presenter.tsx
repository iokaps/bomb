import { config } from '@/config';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { useWakeLock } from '@/hooks/useWakeLock';
import { generateLink } from '@/kit/generate-link';
import { HostPresenterLayout } from '@/layouts/host-presenter';
import { kmClient } from '@/services/km-client';
import { globalStore } from '@/state/stores/global-store';
import { KmQrCode } from '@kokimoki/shared';
import { Bomb, Crown, Skull, Trophy } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import * as React from 'react';
import { useSnapshot } from 'valtio';

const App: React.FC = () => {
	const { title } = config;
	const {
		started,
		players,
		bombHolderId,
		playerStatus,
		winnerId,
		currentQuestion,
		playerStats,
		eliminationOrder,
		countdownEndTime,
		questionGenerationStatus,
		questionGenerationProgress
	} = useSnapshot(globalStore.proxy);

	const [countdownSeconds, setCountdownSeconds] = React.useState(5);

	useWakeLock();
	useDocumentTitle(title);

	// Update countdown timer
	React.useEffect(() => {
		if (!countdownEndTime) return;

		const interval = setInterval(() => {
			const now = kmClient.serverTimestamp();
			const remaining = Math.ceil((countdownEndTime - now) / 1000);
			setCountdownSeconds(Math.max(0, remaining));
		}, 100);

		return () => clearInterval(interval);
	}, [countdownEndTime]);

	if (kmClient.clientContext.mode !== 'presenter') {
		throw new Error('App presenter rendered in non-presenter mode');
	}

	const playerLink = generateLink(kmClient.clientContext.playerCode, {
		mode: 'player'
	});

	const rosterEntries = React.useMemo(() => {
		const hasRoundRoster = Object.keys(playerStatus).length > 0;
		const shouldUseRoundRoster =
			started || Boolean(countdownEndTime) || !!winnerId;

		if (shouldUseRoundRoster && hasRoundRoster) {
			return Object.keys(playerStatus)
				.map((id) => {
					const player = players[id];
					return player ? ([id, player] as const) : null;
				})
				.filter((entry): entry is readonly [string, (typeof players)[string]] =>
					Boolean(entry)
				);
		}

		return Object.entries(players);
	}, [started, countdownEndTime, winnerId, playerStatus, players]);

	// Separate players
	const alivePlayers = rosterEntries.filter(
		([id]) => playerStatus[id] !== 'eliminated'
	);
	const eliminatedPlayers = rosterEntries.filter(
		([id]) => playerStatus[id] === 'eliminated'
	);

	// Calculate leaderboard
	const leaderboard = React.useMemo(() => {
		if (!winnerId) return [];

		const eliminatedIdsInOrder = Object.entries(eliminationOrder)
			.sort(([a], [b]) => {
				const aTime = Number(a.split('-')[0]);
				const bTime = Number(b.split('-')[0]);
				return aTime - bTime;
			})
			.map(([, id]) => id);

		// Winner is appended last; reverse for standings (winner first)
		const rankedIds = eliminatedIdsInOrder.slice().reverse();

		return rankedIds.map((id, index) => {
			const stats = playerStats[id];
			return {
				rank: index + 1,
				id,
				name: players[id]?.name || config.unknownPlayerName,
				score: stats?.questionsAnswered || 0,
				holdTime: Math.round((stats?.bombHoldTime || 0) / 1000),
				closeCalls: stats?.closeCalls || 0
			};
		});
	}, [winnerId, eliminationOrder, playerStats, players]);

	return (
		<HostPresenterLayout.Root className="overflow-hidden">
			<HostPresenterLayout.Header>
				<div className="text-sm opacity-70">{config.presenterLabel}</div>
			</HostPresenterLayout.Header>

			<div className="relative flex h-[calc(100vh-150px)] w-full flex-col">
				{/* QR Code Overlay (Top Right) */}
				{!winnerId && (
					<div className="bg-game-surface absolute top-0 right-0 z-50 flex flex-col items-center gap-2 rounded-bl-2xl border-b border-l border-white/10 p-4 shadow-xl">
						<div className="rounded-lg bg-white p-2">
							<KmQrCode data={playerLink} size={100} interactive={false} />
						</div>
						<div className="text-game-text text-xs font-bold">
							{config.presenterJoinGameLabel}
						</div>
					</div>
				)}

				{/* Main Arena (Circle) */}
				<div className="relative flex flex-1 items-center justify-center">
					{/* Center Stage: Question or Status */}
					<div className="pointer-events-none absolute inset-0 z-20 flex flex-col items-center justify-center p-8 text-center">
						<AnimatePresence mode="wait">
							{questionGenerationStatus === 'generating' ? (
								<motion.div
									key="preparing"
									initial={{ opacity: 0 }}
									animate={{ opacity: 1 }}
									exit={{ opacity: 0 }}
									className="flex flex-col items-center gap-6"
								>
									<div className="text-game-text-muted text-2xl tracking-widest uppercase">
										{config.presenterPreparingQuestionsTitle}
									</div>
									<div className="flex items-center gap-4">
										<div className="h-3 w-64 overflow-hidden rounded-full bg-white/20">
											<motion.div
												className="bg-game-primary h-full"
												initial={{ width: 0 }}
												animate={{
													width: `${questionGenerationProgress.total > 0 ? (questionGenerationProgress.current / questionGenerationProgress.total) * 100 : 0}%`
												}}
												transition={{ duration: 0.3 }}
											/>
										</div>
										<span className="text-game-text text-xl font-bold">
											{questionGenerationProgress.current}/
											{questionGenerationProgress.total}
										</span>
									</div>
								</motion.div>
							) : countdownEndTime ? (
								<motion.div
									key="countdown"
									initial={{ scale: 0.5, opacity: 0 }}
									animate={{ scale: 1, opacity: 1 }}
									exit={{ scale: 1.5, opacity: 0 }}
									className="flex flex-col items-center"
								>
									<div className="text-game-text-muted mb-4 text-2xl tracking-widest uppercase">
										{config.playerGetReadyTitle}
									</div>
									<motion.div
										key={countdownSeconds}
										initial={{ scale: 1.5, opacity: 0 }}
										animate={{ scale: 1, opacity: 1 }}
										className="text-game-primary text-[12rem] leading-none font-bold"
									>
										{countdownSeconds}
									</motion.div>
								</motion.div>
							) : winnerId ? (
								<motion.div
									key="leaderboard"
									initial={{ scale: 0.9, opacity: 0 }}
									animate={{ scale: 1, opacity: 1 }}
									className="bg-game-surface/95 flex max-h-[80vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-white/10 shadow-2xl backdrop-blur-xl"
								>
									<div className="bg-game-primary/20 flex items-center justify-center gap-3 p-6">
										<Trophy size={32} className="text-yellow-400" />
										<h2 className="text-3xl font-bold text-white">
											{config.presenterFinalStandingsTitle}
										</h2>
									</div>

									<div className="overflow-y-auto p-6">
										<table className="w-full text-left">
											<thead>
												<tr className="text-game-text-muted border-b border-white/10 text-sm tracking-wider uppercase">
													<th className="pb-4 pl-4 font-medium">
														{config.presenterLeaderboardRankHeader}
													</th>
													<th className="pb-4 font-medium">
														{config.presenterLeaderboardPlayerHeader}
													</th>
													<th className="pb-4 text-center font-medium">
														{config.presenterLeaderboardCorrectAnswersHeader}
													</th>
													<th className="pb-4 text-center font-medium">
														{config.presenterLeaderboardBombTimeHeader}
													</th>
													<th className="pb-4 text-center font-medium">
														{config.presenterLeaderboardCloseCallsHeader}
													</th>
												</tr>
											</thead>
											<tbody className="text-game-text">
												{leaderboard.map((player) => (
													<tr
														key={player.id}
														className={`border-b border-white/5 transition-colors hover:bg-white/5 ${
															player.rank === 1 ? 'bg-yellow-500/10' : ''
														}`}
													>
														<td className="py-4 pl-4">
															<div
																className={`flex h-8 w-8 items-center justify-center rounded-full font-bold ${
																	player.rank === 1
																		? 'bg-yellow-500 text-black'
																		: player.rank === 2
																			? 'bg-gray-300 text-black'
																			: player.rank === 3
																				? 'bg-amber-700 text-white'
																				: 'bg-white/10 text-white/50'
																}`}
															>
																{player.rank}
															</div>
														</td>
														<td className="py-4 text-lg font-bold">
															{player.name}
															{player.rank === 1 && (
																<Crown
																	size={16}
																	className="ml-2 inline text-yellow-400"
																/>
															)}
														</td>
														<td className="py-4 text-center font-mono text-xl">
															{player.score}
														</td>
														<td className="py-4 text-center font-mono text-xl text-red-400">
															{player.holdTime}
															{config.secondsSuffix}
														</td>
														<td className="py-4 text-center font-mono text-xl text-orange-400">
															{player.closeCalls}
														</td>
													</tr>
												))}
											</tbody>
										</table>
									</div>
								</motion.div>
							) : started && currentQuestion ? (
								<motion.div
									key="question"
									initial={{ opacity: 0, y: 20 }}
									animate={{ opacity: 1, y: 0 }}
									exit={{ opacity: 0, y: -20 }}
									className="bg-game-surface/95 flex w-full max-w-md flex-col gap-3 rounded-2xl border border-white/10 p-6 shadow-2xl backdrop-blur-xl"
								>
									<div className="text-game-text-muted text-xs tracking-widest uppercase">
										{config.presenterCurrentQuestionLabel}
									</div>
									<div className="text-game-text text-2xl leading-snug font-bold">
										{currentQuestion.text}
									</div>
								</motion.div>
							) : (
								<motion.div
									key="waiting"
									initial={{ opacity: 0 }}
									animate={{ opacity: 1 }}
									className="text-game-text-muted text-xl italic"
								>
									{started
										? config.presenterWaitingStartedLabel
										: config.presenterWaitingNotStartedLabel}
								</motion.div>
							)}
						</AnimatePresence>
					</div>

					{/* Players Circle - Hide when winner is shown */}
					{!winnerId && (
						<div className="relative z-40 h-[600px] w-[600px]">
							<AnimatePresence>
								{alivePlayers.map(([id, player], index) => {
									const total = alivePlayers.length;
									const angle = (index / total) * 2 * Math.PI - Math.PI / 2; // Start from top
									const radius = 250; // Circle radius
									const x = Math.cos(angle) * radius;
									const y = Math.sin(angle) * radius;

									const isBombHolder = id === bombHolderId;

									return (
										<motion.div
											key={id}
											layoutId={`player-${id}`}
											initial={{ scale: 0, opacity: 0 }}
											animate={{
												x,
												y,
												scale: 1,
												opacity: 1,
												zIndex: isBombHolder ? 20 : 1
											}}
											exit={{ scale: 0, opacity: 0 }}
											transition={{
												type: 'spring',
												stiffness: 60,
												damping: 15
											}}
											className="absolute top-1/2 left-1/2 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center"
										>
											<div
												className={`relative flex h-20 w-20 items-center justify-center rounded-full border-4 shadow-lg transition-colors duration-300 ${
													isBombHolder
														? 'border-red-500 bg-red-900/50 shadow-red-500/50'
														: 'border-white/20 bg-white/10 shadow-black/20'
												}`}
											>
												<div className="h-full w-full overflow-hidden rounded-full">
													{player.photoUrl ? (
														<img
															src={player.photoUrl}
															alt={player.name}
															className="h-full w-full object-cover"
														/>
													) : (
														<div className="flex h-full w-full items-center justify-center text-2xl font-bold text-white">
															{player.name.charAt(0).toUpperCase()}
														</div>
													)}
												</div>

												{/* The Bomb */}
												{isBombHolder && (
													<motion.div
														layoutId="bomb"
														className="absolute -top-4 -right-4 z-30 text-red-500 drop-shadow-[0_0_10px_rgba(239,68,68,0.8)]"
														transition={{
															type: 'spring',
															stiffness: 50,
															damping: 12
														}}
													>
														<motion.div
															animate={{
																scale: [1, 1.2, 1],
																rotate: [0, 5, -5, 0]
															}}
															transition={{
																repeat: Infinity,
																duration: 0.5
															}}
														>
															<Bomb size={48} fill="currentColor" />
														</motion.div>
													</motion.div>
												)}
											</div>
											<div className="bg-game-surface mt-2 rounded px-2 py-1 text-sm font-medium text-white shadow">
												{player.name}
											</div>
										</motion.div>
									);
								})}
							</AnimatePresence>
						</div>
					)}
				</div>

				{/* Graveyard (Eliminated Players) - Hide when winner is shown */}
				{!winnerId && eliminatedPlayers.length > 0 && (
					<div className="border-t border-white/10 bg-black/20 p-4 backdrop-blur-sm">
						<div className="mb-2 flex items-center gap-2 text-sm font-bold tracking-wider text-red-400 uppercase">
							<Skull size={16} /> {config.presenterGraveyardTitle}
						</div>
						<div className="flex flex-wrap gap-4">
							{eliminatedPlayers.map(([id, player]) => (
								<div
									key={id}
									className="flex items-center gap-2 opacity-50 grayscale transition-all hover:opacity-100 hover:grayscale-0"
								>
									<div className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full bg-white/10 text-xs text-white">
										{player.photoUrl ? (
											<img
												src={player.photoUrl}
												alt={player.name}
												className="h-full w-full object-cover"
											/>
										) : (
											player.name.charAt(0)
										)}
									</div>
									<span className="text-sm text-white/70 line-through">
										{player.name}
									</span>
								</div>
							))}
						</div>
					</div>
				)}
			</div>
		</HostPresenterLayout.Root>
	);
};

export default App;
