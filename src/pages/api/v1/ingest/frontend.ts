import type { APIRoute } from "astro";
import { saveHeartbeat } from "../../../../lib/heartbeat/heartbeatStore";
import type { HeartbeatTelemetry } from "../../../../types";

export const prerender = false;

const corsHeaders = {
	"Access-Control-Allow-Origin": "*",
	"Access-Control-Allow-Methods": "POST, OPTIONS",
	"Access-Control-Allow-Headers": "Content-Type",
	"Access-Control-Max-Age": "86400",
	"Cache-Control": "no-store",
};

function isValidHeartbeat(value: unknown): value is HeartbeatTelemetry {
	if (typeof value !== "object" || value === null) {
		return false;
	}
	const record = value as Record<string, unknown>;
	if (typeof record.service !== "string" || record.service.length === 0) {
		return false;
	}
	if (typeof record.api !== "object" || record.api === null) {
		return false;
	}
	const api = record.api as Record<string, unknown>;
	if (typeof api.reachable !== "boolean") {
		return false;
	}
	if (typeof record.ts !== "string" || Number.isNaN(Date.parse(record.ts))) {
		return false;
	}
	return true;
}

export const OPTIONS: APIRoute = () => new Response(null, { status: 204, headers: corsHeaders });

export const POST: APIRoute = async ({ request }) => {
	let body: unknown;
	try {
		body = await request.json();
	} catch {
		return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
			status: 400,
			headers: { ...corsHeaders, "Content-Type": "application/json; charset=utf-8" },
		});
	}

	if (!isValidHeartbeat(body)) {
		return new Response(JSON.stringify({ error: "Invalid heartbeat payload" }), {
			status: 400,
			headers: { ...corsHeaders, "Content-Type": "application/json; charset=utf-8" },
		});
	}

	await saveHeartbeat(body);
	return new Response(null, { status: 204, headers: corsHeaders });
};

export const GET: APIRoute = () =>
	new Response(null, { status: 405, headers: { ...corsHeaders, Allow: "POST, OPTIONS" } });
