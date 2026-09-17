export type ServiceStatus =
	| "operational"
	| "degraded"
	| "partial_outage"
	| "major_outage"
	| "unknown";

export type OverallStatus =
	| "operational"
	| "degraded"
	| "partial_outage"
	| "major_outage"
	| "unknown";

export interface JsonBodyEvaluation {
	statusPath?: string;
	mapping: Record<string, ServiceStatus>;
}

export interface HttpHealthCheck {
	type: "http";
	url: string;
	method: "GET" | "POST" | "HEAD";
	timeoutMs: number;
	expectedStatusCodes: number[];
	headers?: Record<string, string>;
	jsonBody?: JsonBodyEvaluation;
	/** Guarda el cuerpo de la respuesta en details.raw_body (para el detalle en el modal). */
	captureBody?: boolean;
	/** Límite en bytes del cuerpo capturado (por defecto 8192). */
	maxBodyBytes?: number;
}

export interface FrontendHealthCheck {
	type: "frontend";
	url: string;
	timeoutMs: number;
}

export type HealthCheck = HttpHealthCheck | FrontendHealthCheck;

export interface ServiceConfig {
	id: string;
	name: string;
	description?: string;
	group: string;
	enabled: boolean;
	checks: HealthCheck[];
}

export interface HealthCheckResult {
	serviceId: string;
	checkType: string;
	status: ServiceStatus;
	responseTimeMs?: number;
	statusCode?: number;
	error?: string;
	details?: Record<string, unknown>;
	checkedAt: string;
}

export interface ServiceStatusResult {
	id: string;
	name: string;
	group: string;
	description?: string;
	status: ServiceStatus;
	responseTimeMs?: number;
	details?: Record<string, unknown>;
	checks: HealthCheckResult[];
}

export interface MonitoringReport {
	status: OverallStatus;
	checkedAt: string;
	services: ServiceStatusResult[];
}

export interface HeartbeatTelemetry {
	service: string;
	version: string;
	platform: string;
	app_id: string;
	api: {
		reachable: boolean;
		latency_ms: number;
		http_status: number | null;
		endpoint: string;
		status: string;
	};
	auth: {
		authenticated: boolean;
	};
	ts: string;
}

export interface IncidentUpdate {
	id: string;
	status: "investigating" | "identified" | "monitoring" | "resolved";
	message: string;
	createdAt: string;
}

export interface Incident {
	id: string;
	title: string;
	status: "investigating" | "identified" | "monitoring" | "resolved";
	severity: "minor" | "major" | "critical";
	affectedServices: string[];
	startedAt: string;
	resolvedAt?: string;
	updates: IncidentUpdate[];
}
