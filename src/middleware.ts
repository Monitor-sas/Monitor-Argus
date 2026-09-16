import { defineMiddleware } from "astro:middleware";
import { setupI18n } from "@lingui/core";
import { setLinguiContext } from "lingui-for-astro";
import { catalogs } from "./lib/i18n/catalog";

function resolveLocale(request: Request): "en" | "es" {
	const header = request.headers.get("accept-language") ?? "";
	const primary = header.split(",")[0]?.trim().toLowerCase() ?? "";
	const lang = primary.split("-")[0];
	if (lang === "es") {
		return "es";
	}
	return "en";
}

export const onRequest = defineMiddleware((context, next) => {
	const locale = resolveLocale(context.request);
	const i18n = setupI18n({ locale, messages: catalogs });
	setLinguiContext(context.locals, i18n);
	return next();
});
