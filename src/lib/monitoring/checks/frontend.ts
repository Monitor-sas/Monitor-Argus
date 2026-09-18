import type { FrontendHealthCheck, HealthCheckResult, ServiceStatus } from "../../../types";
import { getHeartbeat, VENUS_HEARTBEAT_SERVICE } from "../../heartbeat/heartbeatStore";
import { resolveErrorMessage } from "./http";

const STALE_AFTER_MS = 2 * 60 * 1000;

function heartbeatDerivedStatus(
	apiReachable: boolean | undefined,
	lastHeartbeatTs: string | undefined,
): { status: ServiceStatus; note?: string } {
	if (lastHeartbeatTs === undefined) {
		return { status: "unknown", note: "No heartbeat received" };
	}

	const ageMs = Date.now() - Date.parse(lastHeartbeatTs);
	if (ageMs > STALE_AFTER_MS) {
		return { status: "degraded", note: "Heartbeat is stale" };
	}
	if (apiReachable === false) {
		return { status: "degraded", note: "API reported unreachable by the client" };
	}
	return { status: "operational" };
}

export async function executeFrontendCheck(
	serviceId: string,
	check: FrontendHealthCheck,
): Promise<HealthCheckResult> {
	const checkedAt = new Date().toISOString();
	const controller = new AbortController();
	const timeout = setTimeout(() => controller.abort(), check.timeoutMs);

	const start = performance.now();

	const heartbeat = await getHeartbeat(VENUS_HEARTBEAT_SERVICE);

	const details: Record<string, unknown> = {};
	details.endpoint = check.url;
	if (heartbeat) {
		details.version = heartbeat.version;
		details.platform = heartbeat.platform;
		details.app_id = heartbeat.app_id;
		details.api_reachable = heartbeat.api.reachable;
		details.api_latency_ms = heartbeat.api.latency_ms;
		details.api_http_status = heartbeat.api.http_status;
		details.api_endpoint = heartbeat.api.endpoint;
		details.api_status = heartbeat.api.status;
		details.auth_authenticated = heartbeat.auth.authenticated;
		details.lastHeartbeatTs = heartbeat.ts;
	}

	let response: Response;
	try {
		response = await fetch(check.url, {
			method: "GET",
			signal: controller.signal,
			redirect: "follow",
		});
	} catch (error: unknown) {
		const responseTimeMs = Math.round(performance.now() - start);
		return {
			serviceId,
			checkType: "frontend",
			status: "unknown",
			responseTimeMs,
			error: resolveErrorMessage(error),
			details,
			checkedAt,
		};
	} finally {
		clearTimeout(timeout);
	}

	const responseTimeMs = Math.round(performance.now() - start);

	if (response.status >= 500) {
		return {
			serviceId,
			checkType: "frontend",
			status: "major_outage",
			responseTimeMs,
			statusCode: response.status,
			details,
			checkedAt,
		};
	}

	if (response.status !== 200) {
		return {
			serviceId,
			checkType: "frontend",
			status: "unknown",
			responseTimeMs,
			statusCode: response.status,
			error: `Unexpected status code: ${response.status}`,
			details,
			checkedAt,
		};
	}

	let body = "";
	try {
		body = (await response.text()).trim();
	} catch {
		return {
			serviceId,
			checkType: "frontend",
			status: "unknown",
			responseTimeMs,
			statusCode: response.status,
			error: "Failed to read response body",
			details,
			checkedAt,
		};
	}

	if (body !== "healthy") {
		details.raw_body = body;
		const preview = body.slice(0, 80);
		return {
			serviceId,
			checkType: "frontend",
			status: "degraded",
			responseTimeMs,
			statusCode: response.status,
			error: `Unexpected health body: "${preview}${body.length > preview.length ? "…" : ""}"`,
			details,
			checkedAt,
		};
	}

	details.raw_body = body;

	const derived = heartbeatDerivedStatus(heartbeat?.api.reachable, heartbeat?.ts);

	return {
		serviceId,
		checkType: "frontend",
		status: derived.status,
		responseTimeMs,
		statusCode: response.status,
		error: derived.note,
		details,
		checkedAt,
	};
}
