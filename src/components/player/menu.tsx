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
					<ul className="w-full flex flex-col gap-2">
						<li>
							<button
								onClick={() => handleNavigate('lobby')}
								className="w-full px-4 py-2 text-left rounded-lg hover:bg-slate-100 transition-colors"
							>
								{config.menuGameLobby}
							</button>
						</li>
						<li>
							<button
								onClick={() => handleNavigate('connections')}
								className="w-full px-4 py-2 text-left rounded-lg hover:bg-slate-100 transition-colors"
							>
								{config.menuConnections}
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
			className="w-12 h-12 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center"
			onClick={handleOpen}
		>
			<MenuIcon className="h-6 w-6" />
			<span className="sr-only">{config.menuAriaLabel}</span>
		</button>
	);
};
