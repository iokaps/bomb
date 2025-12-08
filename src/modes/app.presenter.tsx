import { config } from '@/config';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { useGlobalController } from '@/hooks/useGlobalController';
import { generateLink } from '@/kit/generate-link';
import { HostPresenterLayout } from '@/layouts/host-presenter';
import { kmClient } from '@/services/km-client';
import { globalStore } from '@/state/stores/global-store';
import { KmQrCode } from '@kokimoki/shared';
import { Bomb, Crown, Skull } from 'lucide-react';
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
		currentQuestion
	} = useSnapshot(globalStore.proxy);

	useGlobalController();
	useDocumentTitle(title);

	if (kmClient.clientContext.mode !== 'presenter') {
		throw new Error('App presenter rendered in non-presenter mode');
	}

	const playerLink = generateLink(kmClient.clientContext.playerCode, {
		mode: 'player'
	});

	// Separate players
	const alivePlayers = Object.entries(players).filter(
		([id]) => playerStatus[id] !== 'eliminated'
	);
	const eliminatedPlayers = Object.entries(players).filter(
		([id]) => playerStatus[id] === 'eliminated'
	);

	return (
		<HostPresenterLayout.Root className="overflow-hidden">
			<HostPresenterLayout.Header>
				<div className="text-sm opacity-70">{config.presenterLabel}</div>
			</HostPresenterLayout.Header>

			<div className="relative flex h-[calc(100vh-150px)] w-full flex-col">
				{/* QR Code Overlay (Top Right) */}
				<div className="bg-game-surface absolute top-0 right-0 z-50 flex flex-col items-center gap-2 rounded-bl-2xl border-b border-l border-white/10 p-4 shadow-xl">
					<div className="rounded-lg bg-white p-2">
						<KmQrCode data={playerLink} size={100} interactive={false} />
					</div>
					<div className="text-game-text text-xs font-bold">Join Game</div>
				</div>

				{/* Main Arena (Circle) */}
				<div className="relative flex flex-1 items-center justify-center">
					{/* Center Stage: Question or Status */}
					<div className="absolute z-10 flex h-64 w-96 flex-col items-center justify-center rounded-full p-8 text-center">
						<AnimatePresence mode="wait">
							{winnerId ? (
								<motion.div
									key="winner"
									initial={{ scale: 0, opacity: 0 }}
									animate={{ scale: 1, opacity: 1 }}
									className="flex flex-col items-center gap-4"
								>
									<Crown size={64} className="text-yellow-400" />
									<div className="text-4xl font-bold text-yellow-400">
										WINNER
									</div>
									<div className="text-2xl text-white">
										{players[winnerId]?.name}
									</div>
								</motion.div>
							) : started && currentQuestion ? (
								<motion.div
									key="question"
									initial={{ opacity: 0, y: 20 }}
									animate={{ opacity: 1, y: 0 }}
									exit={{ opacity: 0, y: -20 }}
									className="flex flex-col gap-4"
								>
									<div className="text-game-text-muted text-sm tracking-widest uppercase">
										Current Question
									</div>
									<div className="text-game-text text-xl leading-relaxed font-bold">
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
									{started ? 'Get Ready...' : 'Waiting for players...'}
								</motion.div>
							)}
						</AnimatePresence>
					</div>

					{/* Players Circle */}
					<div className="relative h-[600px] w-[600px]">
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
										transition={{ type: 'spring', stiffness: 60, damping: 15 }}
										className="absolute top-1/2 left-1/2 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center"
									>
										<div
											className={`relative flex h-20 w-20 items-center justify-center rounded-full border-4 shadow-lg transition-colors duration-300 ${
												isBombHolder
													? 'border-red-500 bg-red-900/50 shadow-red-500/50'
													: 'border-white/20 bg-white/10 shadow-black/20'
											}`}
										>
											<div className="text-2xl font-bold text-white">
												{player.name.charAt(0).toUpperCase()}
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
				</div>

				{/* Graveyard (Eliminated Players) */}
				{eliminatedPlayers.length > 0 && (
					<div className="border-t border-white/10 bg-black/20 p-4 backdrop-blur-sm">
						<div className="mb-2 flex items-center gap-2 text-sm font-bold tracking-wider text-red-400 uppercase">
							<Skull size={16} /> Graveyard
						</div>
						<div className="flex flex-wrap gap-4">
							{eliminatedPlayers.map(([id, player]) => (
								<div
									key={id}
									className="flex items-center gap-2 opacity-50 grayscale transition-all hover:opacity-100 hover:grayscale-0"
								>
									<div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-xs text-white">
										{player.name.charAt(0)}
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
