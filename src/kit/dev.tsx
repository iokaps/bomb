import { config } from '@/config';
import { useEffect } from 'react';
import { DevFrame } from './dev-frame';

interface Props {
	nPlayerWindows?: number;
}

function Dev({ nPlayerWindows = 4 }: Props) {
	useEffect(() => {
		document.title = 'Dev view - ' + config.title;
	}, []);

	const playerFrames = Array.from({ length: nPlayerWindows }).map((_, i) => (
		<DevFrame
			key={`player${i + 1}`}
			clientKey={`player${i + 1}`}
			context={{ mode: 'player' }}
		/>
	));

	return (
		<div className="grid h-dvh grid-rows-[1fr_1fr] gap-0.5 bg-[#E4D8B4]">
			<div className="grid grid-cols-[1fr_1fr] gap-0.5">
				<DevFrame
					clientKey="host"
					context={{
						mode: 'host',
						playerCode: 'player',
						presenterCode: 'presenter'
					}}
				/>
				<DevFrame
					clientKey="presenter"
					context={{ mode: 'presenter', playerCode: 'player' }}
				/>
			</div>
			<div className="grid grid-flow-col auto-rows-fr gap-0.5">
				{playerFrames}
			</div>
		</div>
	);
}

export default Dev;
