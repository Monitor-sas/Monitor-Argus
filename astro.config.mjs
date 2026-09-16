// @ts-check

import vercel from "@astrojs/vercel";
import { defineConfig } from "astro/config";
import linguiForAstro from "lingui-for-astro/integration";

export default defineConfig({
	output: "server",
	adapter: vercel(),
	integrations: [linguiForAstro()],
	vite: {
		server: {
			cors: {
				origin: "*",
			},
		},
	},
});
