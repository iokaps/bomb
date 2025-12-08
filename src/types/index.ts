import type { Config } from '@/config/schema';

export interface HostClientContext {
	mode: 'host';
	playerCode: string;
	presenterCode: string;
}

export interface PresenterClientContext {
	mode: 'presenter';
	playerCode: string;
}

export interface PlayerClientContext {
	mode: 'player';
}

export type ClientContext =
	| HostClientContext
	| PresenterClientContext
	| PlayerClientContext;

export interface KmEnv {
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
}
