export type RelativeTimeParts = { kind: "now" } | { kind: "s" | "m" | "h" | "d"; value: number };

export function relativeTimeParts(iso: string): RelativeTimeParts {
	const diffMs = Date.now() - Date.parse(iso);
	const seconds = Math.floor(diffMs / 1000);

	if (seconds < 10) {
		return { kind: "now" };
	}
	if (seconds < 60) {
		return { kind: "s", value: seconds };
	}

	const minutes = Math.floor(seconds / 60);
	if (minutes < 60) {
		return { kind: "m", value: minutes };
	}

	const hours = Math.floor(minutes / 60);
	if (hours < 24) {
		return { kind: "h", value: hours };
	}

	const days = Math.floor(hours / 24);
	return { kind: "d", value: days };
}
