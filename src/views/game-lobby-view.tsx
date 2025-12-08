import { config } from '@/config';
import { cn } from '@/utils/cn';
import React from 'react';
import Markdown from 'react-markdown';

interface Props {
	className?: string;
}

/**
 * View to display the game lobby information before the game starts
 * This example is **optional** and can be removed if not needed
 */
export const GameLobbyView: React.FC<React.PropsWithChildren<Props>> = ({
	className
}) => {
	return (
		<div
			className={cn(
				'bg-white border border-gray-200 rounded-lg shadow-md w-full max-w-screen-sm',
				className
			)}
		>
			<div className="p-6 prose">
				<Markdown>{config.gameLobbyMd}</Markdown>
			</div>
		</div>
	);
};
