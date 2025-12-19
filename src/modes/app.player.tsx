import { NameLabel } from '@/components/player/name-label';
import { config } from '@/config';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { useWakeLock } from '@/hooks/useWakeLock';
import { PlayerLayout } from '@/layouts/player';
import { kmClient } from '@/services/km-client';
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
	const { started, winnerId, playerStatus } = useSnapshot(globalStore.proxy);
	const [showCamera, setShowCamera] = React.useState(false);

	const isRoundParticipant = Boolean(playerStatus[kmClient.id]);

	useDocumentTitle(title);
	useWakeLock();

	React.useEffect(() => {
		// During an active/finished round, only round participants enter the game view.
		if (started || winnerId) {
			playerActions.setCurrentView(isRoundParticipant ? 'game' : 'lobby');
			return;
		}
		playerActions.setCurrentView('lobby');
	}, [started, winnerId, isRoundParticipant]);

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
				<PlayerLayout.Header />

				<PlayerLayout.Main>
					{currentView === 'lobby' && <GameLobbyView />}
					{currentView === 'game' && isRoundParticipant && <GameView />}
					{currentView === 'game' && !isRoundParticipant && <GameLobbyView />}
				</PlayerLayout.Main>

				<PlayerLayout.Footer>
					<NameLabel name={name} />
				</PlayerLayout.Footer>
			</PlayerLayout.Root>
		</KmModalProvider>
	);
};

export default App;
