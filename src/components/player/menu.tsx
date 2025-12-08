import { config } from '@/config';
import { playerActions } from '@/state/actions/player-actions';
import type { PlayerState } from '@/state/stores/player-store';
import { useKmModal } from '@kokimoki/shared';
import { MenuIcon } from 'lucide-react';
import * as React from 'react';

/**
 * Menu component to navigate between different views in the player layout
 * This example is **optional** and can be removed if not needed
 */
export const PlayerMenu: React.FC = () => {
	const { openDrawer, closeModal } = useKmModal();

	const handleNavigate = (view: PlayerState['currentView']) => {
		playerActions.setCurrentView(view);
		closeModal();
	};

	const handleOpen = () => {
		openDrawer({
			title: config.menuTitle,
			content: (
				<div className="h-full w-full p-4">
					<ul className="flex w-full flex-col gap-2">
						<li>
							<button
								onClick={() => handleNavigate('lobby')}
								className="w-full rounded-lg px-4 py-3 text-left font-medium transition-colors hover:bg-black/5 dark:hover:bg-white/10"
							>
								{config.menuGameLobby}
							</button>
						</li>
						{/* Add more menu items here */}
					</ul>
				</div>
			)
		});
	};

	return (
		<button
			className="text-game-text flex h-10 w-10 items-center justify-center rounded-full bg-white/10 transition-colors hover:bg-white/20"
			onClick={handleOpen}
		>
			<MenuIcon className="h-5 w-5" />
			<span className="sr-only">{config.menuAriaLabel}</span>
		</button>
	);
};
