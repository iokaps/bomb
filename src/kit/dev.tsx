import { config } from '@/config';
import { useEffect, useMemo } from 'react';
import { DevFrame } from './dev-frame';

interface Props {
	nPlayerWindows?: number;
}

function Dev({ nPlayerWindows = 4 }: Props) {
	useEffect(() => {
		document.title = 'Dev view - ' + config.title;
	}, []);

	const playerContext = useMemo(() => ({ mode: 'player' }) as const, []);
	const hostContext = useMemo(
		() =>
			({
				mode: 'host',
				playerCode: 'player',
				presenterCode: 'presenter'
			}) as const,
		[]
	);
	const presenterContext = useMemo(
		() => ({ mode: 'presenter', playerCode: 'player' }) as const,
		[]
	);

	const playerFrames = Array.from({ length: nPlayerWindows }).map((_, i) => (
		<DevFrame
			key={`player${i + 1}`}
			clientKey={`player${i + 1}`}
			context={playerContext}
		/>
	));

	return (
		<div className="grid h-dvh grid-rows-[1fr_1fr] gap-0.5 bg-[#E4D8B4]">
			<div className="grid grid-cols-[1fr_1fr] gap-0.5">
				<DevFrame clientKey="host" context={hostContext} />
				<DevFrame clientKey="presenter" context={presenterContext} />
			</div>
			<div className="grid grid-flow-col auto-rows-fr gap-0.5">
				{playerFrames}
			</div>
		</div>
	);
}

export default Dev;
