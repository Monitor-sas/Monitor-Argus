import { createHash, timingSafeEqual } from "node:crypto";

export const ADMIN_COOKIE_NAME = "argus:admin";

const SESSION_MAX_AGE_SECONDS = 60 * 60 * 12;

function secret(): string {
	return process.env.STATUS_DETAILS_TOKEN ?? import.meta.env.STATUS_DETAILS_TOKEN ?? "";
}

function adminConfigured(): boolean {
	return secret().length > 0;
}

function sha256(value: string): string {
	return createHash("sha256").update(value, "utf8").digest("hex");
}

function safeEqual(a: string, b: string): boolean {
	const aBuf = Buffer.from(a);
	const bBuf = Buffer.from(b);
	if (aBuf.length !== bBuf.length) {
		return false;
	}
	return timingSafeEqual(aBuf, bBuf);
}

export function adminCookieValue(): string {
	return sha256(`argus-admin:${secret()}`);
}

export function verifyAdminToken(token: string): boolean {
	if (!adminConfigured() || token.length === 0) {
		return false;
	}
	return safeEqual(token, secret());
}

export function verifyAdminCookieValue(value: string | undefined): boolean {
	if (!adminConfigured() || !value) {
		return false;
	}
	return safeEqual(value, adminCookieValue());
}

export function adminCookieHeader(): string {
	return `${ADMIN_COOKIE_NAME}=${adminCookieValue()}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${SESSION_MAX_AGE_SECONDS}`;
}

export function clearAdminCookieHeader(): string {
	return `${ADMIN_COOKIE_NAME}=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0`;
}
