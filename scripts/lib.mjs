import { spawn, spawnSync } from "node:child_process";
import { readFileSync, rmSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
export const astroCli = path.join(root, "node_modules", "astro", "bin", "astro.mjs");
export const DEV_PORT = 4321;

export function loadLocalEnvFile(file) {
	try {
		const content = readFileSync(path.join(root, file), "utf8");
		for (const raw of content.split(/\r?\n/)) {
			const line = raw.trim();
			if (!line || line.startsWith("#")) {
				continue;
			}
			const eq = line.indexOf("=");
			if (eq === -1) {
				continue;
			}
			const key = line.slice(0, eq).trim();
			const value = line
				.slice(eq + 1)
				.trim()
				.replace(/^(['"])(.*)\1$/, "$2");
			if (key && process.env[key] === undefined) {
				process.env[key] = String(value);
			}
		}
	} catch {
		// sin archivo local: se ignora
	}
}

export function loadLocalEnv() {
	loadLocalEnvFile(".env");
	loadLocalEnvFile(".env.local");
}

export function astro(args, options = {}) {
	return spawn(process.execPath, [astroCli, ...args], {
		cwd: root,
		stdio: options.stdio ?? "inherit",
		env: { ...process.env, ASTRO_DEV_BACKGROUND: "1" },
	});
}

export function astroSync(args) {
	const result = spawnSync(process.execPath, [astroCli, ...args], {
		cwd: root,
		encoding: "utf8",
	});
	if (result.stdout) {
		process.stdout.write(result.stdout);
	}
	if (result.stderr) {
		process.stderr.write(result.stderr);
	}
	return {
		status: result.status,
		output: `${result.stdout ?? ""}\n${result.stderr ?? ""}`,
	};
}

export function killByPort(port) {
	const script = [
		`$conns = Get-NetTCPConnection -LocalPort ${port} -State Listen -ErrorAction SilentlyContinue`,
		"if ($conns) {",
		"$pids = $conns.OwningProcess | Sort-Object -Unique",
		"foreach ($p in $pids) { Stop-Process -Id $p -Force -ErrorAction SilentlyContinue }",
		`"killed port ${port}: " + ($pids -join ", ")`,
		"} else {",
		`"port ${port}: no listener"`,
		"}",
	].join(";");
	try {
		const result = spawnSync("powershell", ["-NoProfile", "-Command", script], {
			encoding: "utf8",
		});
		return `${result.stdout ?? ""}${result.stderr ?? ""}`.trim();
	} catch (error) {
		return `killByPort failed: ${error instanceof Error ? error.message : error}`;
	}
}

export function removeVercelOutput() {
	try {
		rmSync(path.join(root, ".vercel", "output"), { recursive: true, force: true });
		return true;
	} catch {
		return false;
	}
}

export function removeAstroDevLock() {
	try {
		rmSync(path.join(root, ".astro", "dev.json"), { force: true });
		return true;
	} catch {
		return false;
	}
}
