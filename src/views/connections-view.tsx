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
				'bg-white border border-gray-200 rounded-lg shadow-md w-full',
				className
			)}
		>
			<div className="p-6">
				<div className="prose">
					<Markdown>{config.connectionsMd}</Markdown>
				</div>

				<div className="mt-4 bg-white border border-gray-200 rounded-lg shadow p-6">
					<div className="text-sm text-gray-500">{config.players}</div>
					<div className="text-3xl font-bold mt-1">{onlinePlayersCount}</div>
				</div>

				{playersList.length > 0 && (
					<div className="mt-4">
						<h3 className="mb-2 text-lg font-semibold">Player List</h3>
						<ul className="bg-slate-50 rounded-lg divide-y divide-gray-200">
							{playersList.map((player) => (
								<li key={player.id} className="px-4 py-3">
									<div className="flex items-center justify-between">
										<span>{player.name}</span>
										<span
											className={cn(
												'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
												player.isOnline
													? 'bg-green-100 text-green-800'
													: 'border border-gray-300 text-gray-700'
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
