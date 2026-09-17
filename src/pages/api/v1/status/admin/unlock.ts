import type { APIRoute } from "astro";
import {
	adminCookieHeader,
	clearAdminCookieHeader,
	verifyAdminToken,
} from "../../../../../lib/auth/admin";

export const GET: APIRoute = () => new Response(null, { status: 405, headers: { Allow: "POST" } });

export const POST: APIRoute = async ({ request }) => {
	let body: unknown;
	try {
		body = await request.json();
	} catch {
		body = null;
	}
	const data = (body ?? {}) as Record<string, unknown>;

	if (data.action === "lock") {
		return new Response(JSON.stringify({ ok: true }), {
			status: 200,
			headers: {
				"Content-Type": "application/json; charset=utf-8",
				"Set-Cookie": clearAdminCookieHeader(),
			},
		});
	}

	const token = typeof data.token === "string" ? data.token : "";
	if (!verifyAdminToken(token)) {
		return new Response(JSON.stringify({ ok: false }), {
			status: 401,
			headers: { "Content-Type": "application/json; charset=utf-8" },
		});
	}

	return new Response(JSON.stringify({ ok: true }), {
		status: 200,
		headers: {
			"Content-Type": "application/json; charset=utf-8",
			"Set-Cookie": adminCookieHeader(),
		},
	});
};
