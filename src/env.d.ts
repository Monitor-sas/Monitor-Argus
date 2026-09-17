/// <reference types="astro/client" />

interface ImportMetaEnv {
	readonly ATLAS_API_URL?: string;
	readonly CHIRPSTACK_URL?: string;
	readonly VENUS_HEALTH_URL?: string;
	readonly VENUS_HEALTH_META_URL?: string;
	readonly STATUS_DETAILS_TOKEN?: string;
}

interface ImportMeta {
	readonly env: ImportMetaEnv;
}

declare namespace App {
	interface Locals {
		admin: boolean;
	}
}
