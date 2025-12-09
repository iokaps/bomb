import { PlayerMenu } from '@/components/player/menu';
import { NameLabel } from '@/components/player/name-label';
import { config } from '@/config';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { useWakeLock } from '@/hooks/useWakeLock';
import { PlayerLayout } from '@/layouts/player';
import { playerActions } from '@/state/actions/player-actions';
import { globalStore } from '@/state/stores/global-store';
import { playerStore } from '@/state/stores/player-store';
import { CameraCaptureView } from '@/views/camera-capture-view';
import { CreateProfileView } from '@/views/create-profile-view';
import { GameLobbyView } from '@/views/game-lobby-view';
import { GameView } from '@/views/game-view';
import { KmModalProvider } from '@kokimoki/shared';
import * as React from 'react';
import { useSnapshot } from 'valtio';

const App: React.FC = () => {
	const { title } = config;
	const { name, currentView, hasPhoto } = useSnapshot(playerStore.proxy);
	const { started, winnerId } = useSnapshot(globalStore.proxy);
	const [showCamera, setShowCamera] = React.useState(false);

	useDocumentTitle(title);
	useWakeLock();

	React.useEffect(() => {
		// While game start, force view to 'game', otherwise to 'lobby'
		if (started || winnerId) {
			playerActions.setCurrentView('game');
		} else {
			playerActions.setCurrentView('lobby');
		}
	}, [started, winnerId]);

	if (!name || (name && !hasPhoto && showCamera)) {
		return (
			<PlayerLayout.Root>
				<PlayerLayout.Header />
				<PlayerLayout.Main>
					{!showCamera ? (
						<CreateProfileView onNameSet={() => setShowCamera(true)} />
					) : (
						<CameraCaptureView onComplete={() => setShowCamera(false)} />
					)}
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
