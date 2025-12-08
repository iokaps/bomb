import { config } from '@/config';
import { useServerTimer } from '@/hooks/useServerTime';
import { kmClient } from '@/services/km-client';
import { globalActions } from '@/state/actions/global-actions';
import { globalStore } from '@/state/stores/global-store';
import { cn } from '@/utils/cn';
import { KmTimeCountdown } from '@kokimoki/shared';
import React from 'react';
import Markdown from 'react-markdown';
import { useSnapshot } from 'valtio';

interface Props {
	className?: string;
}

/**
 * View to display the global shared state of the game,  including controls for the 'host' mode
 * This example is **optional** and can be removed if not needed
 */
export const SharedStateView: React.FC<React.PropsWithChildren<Props>> = ({
	className
}) => {
	const { started, startTimestamp } = useSnapshot(globalStore.proxy);
	const serverTime = useServerTimer();
	const isHost = kmClient.clientContext.mode === 'host';

	return (
		<div
			className={cn(
				'bg-white border border-gray-200 rounded-lg shadow-md w-full',
				className
			)}
		>
			<div className="p-6">
				<div className="prose">
					<Markdown>{config.sharedStateMd}</Markdown>
				</div>

				<div className="mt-4 grid gap-4">
					{started && (
						<div className="bg-white border border-gray-200 rounded-lg shadow p-6">
							<div className="text-sm text-gray-500">{config.timeElapsed}</div>
							<div className="text-3xl font-bold mt-1">
								<KmTimeCountdown ms={serverTime - startTimestamp} />
							</div>
						</div>
					)}

					{!started && isHost && (
						<button
							className="px-4 py-2 rounded-lg bg-blue-500 text-white hover:bg-blue-600 font-medium"
							onClick={globalActions.startGame}
						>
							{config.startButton}
						</button>
					)}

					{started && isHost && (
						<button
							className="px-4 py-2 rounded-lg bg-red-500 text-white hover:bg-red-600 font-medium"
							onClick={globalActions.stopGame}
						>
							{config.stopButton}
						</button>
					)}
				</div>
			</div>
		</div>
	);
};
