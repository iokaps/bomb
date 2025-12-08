import { kmEnv } from '@/services/km-client';
import type { ClientContext } from '@/types';

/**
 * @param code Kokimoki code for fetching context
 * @param fallbackContext Context used in dev mode
 * @returns
 */
export function generateLink(code: string, fallbackContext: ClientContext) {
	if (kmEnv.dev) {
		return `${window.location.origin}?key=${code}&context=${btoa(JSON.stringify(fallbackContext))}`;
	}

	return `${window.location.origin}/${code}`;
}
