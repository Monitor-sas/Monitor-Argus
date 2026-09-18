import type { HeartbeatTelemetry } from "../../types";
import { getHeartbeatRepository } from "../persistence/heartbeat";

/** Clave exacta del servicio Venus en el latido (también la que usa el check). */
export const VENUS_HEARTBEAT_SERVICE = "Monitor_Venus";

export async function saveHeartbeat(telemetry: HeartbeatTelemetry): Promise<void> {
	await getHeartbeatRepository().saveHeartbeat(telemetry);
}

export async function getHeartbeat(service: string): Promise<HeartbeatTelemetry | undefined> {
	return getHeartbeatRepository().getHeartbeat(service);
}
