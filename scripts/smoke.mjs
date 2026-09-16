import { astro, DEV_PORT, killByPort, removeAstroDevLock } from "./lib.mjs";

const BASE = `http://localhost:${DEV_PORT}`;
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const results = [];
const check = (label, ok, detail = "") => {
	results.push({ label, ok, detail });
	console.log(`${ok ? "PASS" : "FAIL"}  ${label}${detail ? `  (${detail})` : ""}`);
};

let buffer = "";
let child;

async function waitUntilReady(url, timeoutMs = 30000) {
	const start = Date.now();
	while (Date.now() - start < timeoutMs) {
		try {
			const response = await fetch(url);
			if (response.status === 200) {
				return true;
			}
		} catch {}
		await sleep(500);
	}
	return false;
}

async function run() {
	console.log(`[smoke] Deteniendo cualquier listener previo en :${DEV_PORT}...`);
	killByPort(DEV_PORT);
	removeAstroDevLock();

	console.log("[smoke] Arrancando astro dev...");
	child = astro(["dev", "--port", String(DEV_PORT)], { stdio: "pipe" });
	child.stdout?.on("data", (chunk) => {
		buffer += chunk.toString();
		if (buffer.length > 20000) {
			buffer = buffer.slice(-20000);
		}
	});
	child.stderr?.on("data", (chunk) => {
		buffer += chunk.toString();
		if (buffer.length > 20000) {
			buffer = buffer.slice(-20000);
		}
	});

	const ready = await waitUntilReady(`${BASE}/`);
	check("servidor dev responde en /", ready);
	if (!ready) {
		console.error(buffer.split("\n").slice(-30).join("\n"));
		return;
	}

	let response = await fetch(`${BASE}/`);
	const html = await response.text();
	check("HTML incluye botones del theme switcher", html.includes("data-theme-option"));
	check("HTML incluye logo del proyecto", html.includes("cls-2"));
	check("HTML incluye script boot de tema", html.includes("argus:theme"));

	response = await fetch(`${BASE}/api/v1/ingest/frontend`, { method: "OPTIONS" });
	check("OPTIONS ingest responde 204", response.status === 204, `status ${response.status}`);
	check(
		"OPTIONS ingest incluye Access-Control-Allow-Origin",
		response.headers.get("access-control-allow-origin") === "*",
	);

	response = await fetch(`${BASE}/api/v1/ingest/frontend`);
	check("GET ingest responde 405", response.status === 405, `status ${response.status}`);

	response = await fetch(`${BASE}/api/v1/ingest/frontend`, {
		method: "POST",
		headers: { "content-type": "application/json" },
		body: JSON.stringify({ foo: "bar" }),
	});
	check(
		"POST heartbeat invalido responde 400",
		response.status === 400,
		`status ${response.status}`,
	);

	const heartbeat = {
		service: "Monitor_Venus",
		version: "1.0.0",
		platform: "web",
		app_id: "com.mtr.online",
		api: {
			reachable: true,
			latency_ms: 120,
			http_status: 200,
			endpoint: `${BASE}/api/status`,
			status: "ok",
		},
		auth: {
			authenticated: true,
		},
		ts: new Date().toISOString(),
	};
	response = await fetch(`${BASE}/api/v1/ingest/frontend`, {
		method: "POST",
		headers: { "content-type": "application/json" },
		body: JSON.stringify(heartbeat),
	});
	check("POST heartbeat valido responde 204", response.status === 204, `status ${response.status}`);
	check(
		"POST heartbeat incluye Cache-Control no-store",
		(response.headers.get("cache-control") ?? "").includes("no-store"),
	);

	console.log("[smoke] Esperando 31s a que expire la cache de statusService (30s)...");
	await sleep(31000);

	response = await fetch(`${BASE}/api/status`);
	const statusPayload = await response.text();
	const status = JSON.parse(statusPayload);
	check("status responde 200", response.status === 200, `status ${response.status}`);
	const venus = (status.services ?? []).find((service) => service.id === "venus");
	check("status incluye servicio venus", Boolean(venus));
	check("venus conserva los detalles del heartbeat", venus?.details?.version === "1.0.0");
	check(
		"venus reporta almeno un heartbeat (lastHeartbeatTs)",
		typeof venus?.details?.lastHeartbeatTs === "string" && venus.details.lastHeartbeatTs.length > 0,
	);

	response = await fetch(`${BASE}/`);
	const htmlAfter = await response.text();
	check(
		"HTML recarga la fila con version y beat",
		htmlAfter.includes("v1.0.0") && htmlAfter.includes("beat "),
	);

	const failed = results.filter((result) => !result.ok);
	console.log(
		failed.length === 0
			? `\n[smoke] TODOS LOS CHECKS PASARON (${results.length})`
			: `\n[smoke] ${failed.length} check(s) fallaron de ${results.length}`,
	);
	process.exitCode = failed.length === 0 ? 0 : 1;
}

run().finally(() => {
	child?.kill("SIGTERM");
	killByPort(DEV_PORT);
});
