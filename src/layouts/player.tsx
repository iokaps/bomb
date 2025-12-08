import { config } from '@/config';
import { cn } from '@/utils/cn';
import * as React from 'react';

interface LayoutProps {
	children?: React.ReactNode;
	className?: string;
}

const PlayerRoot: React.FC<LayoutProps> = ({ children, className }) => (
	<main
		className={cn(
			'bg-game-bg text-game-text grid min-h-dvh grid-rows-[auto_1fr_auto]',
			className
		)}
	>
		{children}
	</main>
);

const PlayerHeader: React.FC<LayoutProps> = ({ children, className }) => (
	<header
		className={cn(
			'bg-game-surface sticky top-0 z-10 border-b border-white/10 py-4 shadow-lg',
			className
		)}
	>
		<div className="container mx-auto flex flex-wrap items-center justify-between px-4">
			<div className="from-game-primary to-game-secondary bg-gradient-to-r bg-clip-text text-xl font-bold text-transparent">
				{config.title}
			</div>

			{children}
		</div>
	</header>
);

const PlayerMain: React.FC<LayoutProps> = ({ children, className }) => (
	<main
		className={cn(
			'container mx-auto flex items-center justify-center p-4 lg:p-6',
			className
		)}
	>
		{children}
	</main>
);

const PlayerFooter: React.FC<LayoutProps> = ({ children, className }) => (
	<footer
		className={cn(
			'bg-game-surface text-game-text sticky bottom-0 z-10 border-t border-white/10 p-4',
			className
		)}
	>
		{children}
	</footer>
);

/**
 * Layout components for the 'player' mode
 */
export const PlayerLayout = {
	Root: PlayerRoot,
	Header: PlayerHeader,
	Main: PlayerMain,
	Footer: PlayerFooter
};
