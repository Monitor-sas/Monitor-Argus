import { defineConfig } from "lingui-for-astro/config";
import { astroExtractor } from "lingui-for-astro/extractor";

export default defineConfig({
	sourceLocale: "en",
	locales: ["en", "es"],
	catalogs: [
		{
			path: "<rootDir>/src/lib/i18n/locales/{locale}",
			include: ["src"],
		},
	],
	extractors: [astroExtractor],
});
