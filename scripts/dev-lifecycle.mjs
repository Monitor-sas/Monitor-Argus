import { astro, DEV_PORT, killByPort, loadLocalEnv } from "./lib.mjs";

const [command, ...rest] = process.argv.slice(2);
const arg = (name, fallback) => {
	const index = rest.indexOf(name);
	return index === -1 ? fallback : rest[index + 1];
};
const port = Number(arg("--port", DEV_PORT));

function usage() {
	console.log("Uso: node scripts/dev-lifecycle.mjs <dev|stop> [--port 4321]");
	process.exit(1);
}

if (command === "dev") {
	loadLocalEnv();
	const child = astro(["dev", "--port", String(port)]);
	for (const signal of ["SIGINT", "SIGTERM"]) {
		process.on(signal, () => {
			child.kill(signal);
		});
	}
	child.on("exit", (code) => {
		process.exit(code ?? 0);
	});
} else if (command === "stop") {
	console.log(killByPort(port));
} else {
	usage();
}
