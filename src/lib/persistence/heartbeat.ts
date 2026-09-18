import { kv } from "@vercel/kv";
import type { HeartbeatTelemetry } from "../../types";

export interface HeartbeatRepository {
	saveHeartbeat(telemetry: HeartbeatTelemetry): Promise<void>;
	getHeartbeat(service: string): Promise<HeartbeatTelemetry | undefined>;
}

/** Expira los latidos que llevan más de 5 min sin renovarse (margen sobre el umbral de 2 min). */
const HEARTBEAT_TTL_SECONDS = 300;

const memory = new Map<string, HeartbeatTelemetry>();

class InMemoryHeartbeatRepository implements HeartbeatRepository {
	async saveHeartbeat(telemetry: HeartbeatTelemetry): Promise<void> {
		memory.set(telemetry.service, telemetry);
	}

	async getHeartbeat(service: string): Promise<HeartbeatTelemetry | undefined> {
		return memory.get(service);
	}
}

class KVHeartbeatRepository implements HeartbeatRepository {
	async saveHeartbeat(telemetry: HeartbeatTelemetry): Promise<void> {
		await kv.set(`argus:heartbeat:${telemetry.service}`, telemetry, {
			ex: HEARTBEAT_TTL_SECONDS,
		});
	}

	async getHeartbeat(service: string): Promise<HeartbeatTelemetry | undefined> {
		const telemetry = await kv.get<HeartbeatTelemetry>(`argus:heartbeat:${service}`);
		return telemetry ?? undefined;
	}
}

let repository: HeartbeatRepository | undefined;

export function getHeartbeatRepository(): HeartbeatRepository {
	if (!repository) {
		repository = import.meta.env.KV_REST_API_URL
			? new KVHeartbeatRepository()
			: new InMemoryHeartbeatRepository();
	}
	return repository;
}
