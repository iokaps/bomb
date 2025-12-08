import { PlayerMenu } from '@/components/player/menu';
import { NameLabel } from '@/components/player/name-label';
import { config } from '@/config';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { useGlobalController } from '@/hooks/useGlobalController';
import { PlayerLayout } from '@/layouts/player';
import { playerActions } from '@/state/actions/player-actions';
import { globalStore } from '@/state/stores/global-store';
import { playerStore } from '@/state/stores/player-store';
import { ConnectionsView } from '@/views/connections-view';
import { CreateProfileView } from '@/views/create-profile-view';
import { GameLobbyView } from '@/views/game-lobby-view';
import { GameView } from '@/views/game-view';
import { KmModalProvider } from '@kokimoki/shared';
import * as React from 'react';
import { useSnapshot } from 'valtio';

const App: React.FC = () => {
	const { title } = config;
	const { name, currentView } = useSnapshot(playerStore.proxy);
	const { started } = useSnapshot(globalStore.proxy);

	useGlobalController();
	useDocumentTitle(title);

	React.useEffect(() => {
		console.log('App Player Mounted');
	}, []);

	React.useEffect(() => {
		// While game start, force view to 'game', otherwise to 'lobby'
		if (started) {
			playerActions.setCurrentView('game');
		} else {
			playerActions.setCurrentView('lobby');
		}
	}, [started]);

	if (!name) {
		return (
			<PlayerLayout.Root>
				<PlayerLayout.Header />
				<PlayerLayout.Main>
					<CreateProfileView />
				</PlayerLayout.Main>
			</PlayerLayout.Root>
		);
	}

	return (
		<KmModalProvider>
			<PlayerLayout.Root>
				<PlayerLayout.Header>
					<div className="flex items-center gap-2">
						<PlayerMenu />
					</div>
				</PlayerLayout.Header>

				<PlayerLayout.Main>
					{currentView === 'lobby' && <GameLobbyView />}
					{currentView === 'connections' && <ConnectionsView />}
					{currentView === 'game' && <GameView />}
				</PlayerLayout.Main>

				<PlayerLayout.Footer>
					<NameLabel name={name} />
				</PlayerLayout.Footer>
			</PlayerLayout.Root>
		</KmModalProvider>
	);
};

export default App;
