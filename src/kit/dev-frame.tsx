import type { ClientContext } from '@/types';
import { useCallback, useEffect, useMemo, useRef, type FC } from 'react';
import { generateLink } from './generate-link';

interface Props {
	clientKey: string;
	context: ClientContext;
}

export const DevFrame: FC<Props> = ({ clientKey, context }) => {
	const iframeRef = useRef<HTMLIFrameElement | null>(null);

	const link = useMemo(
		() => generateLink(clientKey, context),
		[clientKey, context]
	);

	const onMessage = useCallback(
		(event: MessageEvent) => {
			if (
				!iframeRef.current?.contentWindow ||
				event.source !== iframeRef.current?.contentWindow
			)
				return;

			if (event.data.appId) {
				iframeRef.current.contentWindow.postMessage(
					{ clientKey: clientKey },
					'*'
				);
			}
		},
		[clientKey]
	);

	useEffect(() => {
		window.addEventListener('message', onMessage);
		return () => window.removeEventListener('message', onMessage);
	}, [onMessage]);

	function clearStorage() {
		iframeRef.current?.contentWindow?.postMessage('km:clearStorage', '*');
	}

	return (
		<div className="grid grid-rows-[auto_1fr] bg-[#ECE3CA] text-[#793205]">
			<div className="inline-flex justify-center gap-3 py-2 text-sm">
				<div className="font-semibold">{clientKey}</div>

				<a
					href={link}
					className="hover:link"
					target="_blank"
					rel="noopener noreferrer"
				>
					New tab
				</a>
				<button className="hover:link" onClick={clearStorage}>
					Reset
				</button>
			</div>

			<iframe
				ref={iframeRef}
				className="h-full w-full"
				title={clientKey}
				src={link}
			/>
		</div>
	);
};
