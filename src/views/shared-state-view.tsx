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
				'bg-game-surface w-full rounded-lg border border-white/10 shadow-xl',
				className
			)}
		>
			<div className="p-6">
				<div className="prose prose-invert max-w-none">
					<Markdown>{config.sharedStateMd}</Markdown>
				</div>

				<div className="mt-6 grid gap-4">
					{started && (
						<div className="rounded-lg border border-white/10 bg-white/5 p-6">
							<div className="text-game-text-muted text-sm">
								{config.timeElapsed}
							</div>
							<div className="text-game-text mt-1 text-3xl font-bold">
								<KmTimeCountdown ms={serverTime - startTimestamp} />
							</div>
						</div>
					)}

					{!started && isHost && (
						<button
							className="bg-game-primary rounded-lg px-4 py-2 font-medium text-white transition-colors hover:bg-indigo-600"
							onClick={globalActions.startGame}
						>
							{config.startButton}
						</button>
					)}

					{started && isHost && (
						<button
							className="rounded-lg bg-red-600 px-4 py-2 font-medium text-white transition-colors hover:bg-red-700"
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
