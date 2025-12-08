import { config } from '@/config';
import { globalStore } from '@/state/stores/global-store';
import { cn } from '@/utils/cn';
import React from 'react';
import Markdown from 'react-markdown';
import { useSnapshot } from 'valtio';

interface Props {
	className?: string;
}

/**
 * View to display players who have joined the game and their online status.
 * This example is **optional** and can be removed if not needed
 */
export const ConnectionsView: React.FC<React.PropsWithChildren<Props>> = ({
	className
}) => {
	const players = useSnapshot(globalStore.proxy).players;
	const onlinePlayerIds = useSnapshot(globalStore.connections).clientIds;
	const playersList = Object.entries(players).map(([id, player]) => ({
		id,
		name: player.name,
		isOnline: onlinePlayerIds.has(id)
	}));
	const onlinePlayersCount = playersList.filter((p) => p.isOnline).length;

	return (
		<div
			className={cn(
				'bg-game-surface w-full rounded-lg border border-white/10 shadow-xl',
				className
			)}
		>
			<div className="p-6">
				<div className="prose prose-invert max-w-none">
					<Markdown>{config.connectionsMd}</Markdown>
				</div>

				<div className="mt-6 rounded-lg border border-white/10 bg-white/5 p-6">
					<div className="text-game-text-muted text-sm">{config.players}</div>
					<div className="text-game-text mt-1 text-3xl font-bold">
						{onlinePlayersCount}
					</div>
				</div>

				{playersList.length > 0 && (
					<div className="mt-6">
						<h3 className="text-game-text mb-3 text-lg font-semibold">
							Player List
						</h3>
						<ul className="divide-y divide-white/10 rounded-lg border border-white/10 bg-white/5">
							{playersList.map((player) => (
								<li key={player.id} className="px-4 py-3">
									<div className="text-game-text flex items-center justify-between">
										<span>{player.name}</span>
										<span
											className={cn(
												'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium',
												player.isOnline
													? 'border-green-500/30 bg-green-500/20 text-green-400'
													: 'text-game-text-muted border-white/10 bg-white/5'
											)}
										>
											{player.isOnline ? 'Online' : 'Offline'}
										</span>
									</div>
								</li>
							))}
						</ul>
					</div>
				)}
			</div>
		</div>
	);
};
