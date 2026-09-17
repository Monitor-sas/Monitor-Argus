import type {
	HealthCheckResult,
	HttpHealthCheck,
	JsonBodyEvaluation,
	ServiceStatus,
} from "../../../types";

function classifyByStatusCode(statusCode: number, expectedCodes: number[]): ServiceStatus {
	if (expectedCodes.includes(statusCode)) {
		return "operational";
	}
	if (statusCode >= 500) {
		return "major_outage";
	}
	return "unknown";
}

function resolvePath(data: unknown, path: string): unknown {
	return path.split(".").reduce<unknown>((acc, key) => {
		if (acc !== null && typeof acc === "object" && key in acc) {
			return (acc as Record<string, unknown>)[key];
		}
		return undefined;
	}, data);
}

async function evaluateBody(
	response: Response,
	evaluation: JsonBodyEvaluation,
): Promise<{ status: ServiceStatus; error?: string }> {
	let data: unknown;
	try {
		data = await response.json();
	} catch {
		if (response.status >= 500) {
			return { status: "major_outage" };
		}
		return { status: "unknown", error: "Invalid health-check response body" };
	}

	const bodyStatus = resolvePath(data, evaluation.statusPath ?? "status");
	if (typeof bodyStatus === "string") {
		const mapped = evaluation.mapping[bodyStatus];
		if (mapped) {
			return { status: mapped };
		}
		return { status: "unknown", error: `Unrecognized status value: ${bodyStatus}` };
	}

	return { status: "unknown", error: "Health-check response missing status field" };
}

export async function executeHttpCheck(
	serviceId: string,
	check: HttpHealthCheck,
): Promise<HealthCheckResult> {
	const checkedAt = new Date().toISOString();
	const controller = new AbortController();
	const timeout = setTimeout(() => controller.abort(), check.timeoutMs);

	const start = performance.now();

	try {
		const response = await fetch(check.url, {
			method: check.method,
			headers: check.headers,
			signal: controller.signal,
			redirect: "follow",
		});

		const responseTimeMs = Math.round(performance.now() - start);

		if (check.jsonBody) {
			const evaluation = await evaluateBody(response, check.jsonBody);
			return {
				serviceId,
				checkType: "http",
				status: evaluation.status,
				responseTimeMs,
				statusCode: response.status,
				error: evaluation.error,
				checkedAt,
			};
		}

		const status = classifyByStatusCode(response.status, check.expectedStatusCodes);

		const details = check.captureBody
			? await captureResponseBody(response)
			: undefined;

		return {
			serviceId,
			checkType: "http",
			status,
			responseTimeMs,
			statusCode: response.status,
			details,
			checkedAt,
		};
	} catch (error: unknown) {
		const responseTimeMs = Math.round(performance.now() - start);
		const errorMessage = resolveErrorMessage(error);

		return {
			serviceId,
			checkType: "http",
			status: "unknown",
			responseTimeMs,
			error: errorMessage,
			checkedAt,
		};
	} finally {
		clearTimeout(timeout);
	}
}

export function resolveErrorMessage(error: unknown): string {
	if (error instanceof DOMException && error.name === "AbortError") {
		return "Request timed out";
	}
	if (error instanceof TypeError) {
		const message = error.message.toLowerCase();
		if (message.includes("dns") || message.includes("getaddrinfo")) {
			return "DNS resolution failed";
		}
		if (message.includes("ssl") || message.includes("tls") || message.includes("certificate")) {
			return "TLS/SSL error";
		}
		if (message.includes("econnrefused")) {
			return "Connection refused";
		}
		if (message.includes("econnreset")) {
			return "Connection reset";
		}
		return `Network error: ${error.message}`;
	}
	if (error instanceof Error) {
		return error.message;
	}
	return "Unknown error";
}
