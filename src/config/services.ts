import type { ServiceConfig, ServiceStatus } from "../types";

const atlasBaseUrl = import.meta.env.ATLAS_API_URL ?? "http://localhost:8000";
const chirpstackBaseUrl = import.meta.env.CHIRPSTACK_URL ?? "http://localhost:8083";
const venusHealthUrl = import.meta.env.VENUS_HEALTH_URL ?? "http://localhost:3000/health";

const upstreamStatusMapping: Record<string, ServiceStatus> = {
	healthy: "operational",
	degraded: "degraded",
	unhealthy: "major_outage",
	unreachable: "major_outage",
	not_configured: "unknown",
};

export const services: ServiceConfig[] = [
	{
		id: "venus",
		name: "Venus",
		group: "Monitor Platform",
		description: "Frontend application",
		enabled: true,
		checks: [
			{
				type: "frontend",
				url: venusHealthUrl,
				timeoutMs: 8000,
			},
		],
	},
	{
		id: "atlas",
		name: "Atlas",
		group: "Monitor Platform",
		description: "Monitor backend API",
		enabled: true,
		checks: [
			{
				type: "http",
				url: `${atlasBaseUrl}/api/v1/system/health/atlas/`,
				method: "GET",
				timeoutMs: 10000,
				expectedStatusCodes: [200],
				jsonBody: {
					statusPath: "status",
					mapping: upstreamStatusMapping,
				},
			},
		],
	},
	{
		id: "hermes",
		name: "Hermes",
		group: "Monitor Platform",
		description: "Real-time service",
		enabled: true,
		checks: [
			{
				type: "http",
				url: `${atlasBaseUrl}/api/v1/system/health/hermes/`,
				method: "GET",
				timeoutMs: 10000,
				expectedStatusCodes: [200],
				jsonBody: {
					statusPath: "status",
					mapping: upstreamStatusMapping,
				},
			},
		],
	},
	{
		id: "chirpstack",
		name: "ChirpStack",
		group: "Infrastructure",
		description: "LoRaWAN network server",
		enabled: true,
		checks: [
			{
				type: "http",
				url: `${chirpstackBaseUrl}/health`,
				method: "GET",
				timeoutMs: 5000,
				expectedStatusCodes: [200],
			},
			{
				type: "http",
				url: `${chirpstackBaseUrl}/metrics`,
				method: "GET",
				timeoutMs: 5000,
				expectedStatusCodes: [200],
			},
		],
	},
];

export function getEnabledServices(): ServiceConfig[] {
	return services.filter((s) => s.enabled);
}

export function getServiceGroups(): Map<string, ServiceConfig[]> {
	const groups = new Map<string, ServiceConfig[]>();
	for (const service of getEnabledServices()) {
		const group = groups.get(service.group) ?? [];
		group.push(service);
		groups.set(service.group, group);
	}
	return groups;
}
