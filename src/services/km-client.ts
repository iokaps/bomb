import type { Config } from '@/config/schema';
import type { ClientContext } from '@/types';
import { KokimokiClient } from '@kokimoki/app';

// Get kokimoki env
export const kmEnv: {
	dev: boolean;
	test: boolean;
	host: string;
	appId: string;
	code?: string;
	clientContext?: string;
	config?: string;
	configObject?: Config;
	base: string;
	assets: string;
} = JSON.parse(document.getElementById('kokimoki-env')!.textContent!);

// Export the config
export function getConfig(): Config {
	if (kmEnv.configObject) {
		return kmEnv.configObject;
	}

	if (kmEnv.config) {
		return JSON.parse(kmEnv.config);
	}

	throw new Error('No Kokimoki config provided');
}

// Create a Kokimoki client
export const kmClient = new KokimokiClient<ClientContext>(
	kmEnv.host,
	kmEnv.appId,
	kmEnv.code
);
