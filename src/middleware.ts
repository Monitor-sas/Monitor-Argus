import { defineMiddleware } from "astro:middleware";
import { setupI18n } from "@lingui/core";
import type { AstroCookies } from "astro";
import { setLinguiContext } from "lingui-for-astro";
import { catalogs } from "./lib/i18n/catalog";

function resolveLocale(request: Request, cookies: AstroCookies): "en" | "es" {
	const stored = cookies.get("argus:lang")?.value;
	if (stored === "en" || stored === "es") {
		return stored;
	}
	const header = request.headers.get("accept-language") ?? "";
	const primary = header.split(",")[0]?.trim().toLowerCase() ?? "";
	const lang = primary.split("-")[0];
	if (lang === "es") {
		return "es";
	}
	return "en";
}

export const onRequest = defineMiddleware((context, next) => {
	const locale = resolveLocale(context.request, context.cookies);
	const i18n = setupI18n({ locale, messages: catalogs });
	setLinguiContext(context.locals, i18n);
	return next();
});
