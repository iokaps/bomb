import { config } from '@/config';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { useGlobalController } from '@/hooks/useGlobalController';
import { generateLink } from '@/kit/generate-link';
import { HostPresenterLayout } from '@/layouts/host-presenter';
import { kmClient } from '@/services/km-client';
import { ConnectionsView } from '@/views/connections-view';
import { KmQrCode } from '@kokimoki/shared';
import * as React from 'react';

const App: React.FC = () => {
	const { title } = config;

	useGlobalController();
	useDocumentTitle(title);

	if (kmClient.clientContext.mode !== 'presenter') {
		throw new Error('App presenter rendered in non-presenter mode');
	}

	const playerLink = generateLink(kmClient.clientContext.playerCode, {
		mode: 'player'
	});

	return (
		<HostPresenterLayout.Root>
			<HostPresenterLayout.Header>
				<div className="text-sm opacity-70">{config.presenterLabel}</div>
			</HostPresenterLayout.Header>

			<HostPresenterLayout.Main>
				<div className="rounded-lg border border-gray-200 bg-white shadow-md">
					<div className="flex flex-col gap-2 p-6">
						<h2 className="text-xl font-bold">{config.playerLinkLabel}</h2>
						<KmQrCode data={playerLink} size={200} interactive={false} />

						<a
							href={playerLink}
							target="_blank"
							rel="noreferrer"
							className="break-all text-blue-600 underline hover:text-blue-700"
						>
							{config.playerLinkLabel}
						</a>
					</div>
				</div>

				<ConnectionsView />
			</HostPresenterLayout.Main>
		</HostPresenterLayout.Root>
	);
};

export default App;
