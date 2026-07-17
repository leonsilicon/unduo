import { generateKeyPairSync } from "node:crypto";

import { base32, base32nopad } from "@scure/base";
import createDebug from "debug";
import { destr } from "destr";

import { type DuoActivation, duoResponseSchema } from "./entities.ts";

const debug = createDebug("unduo:api");

// The DUO Mobile activation endpoint expects a device payload identifying an
// Android install. These values are copied from a recent DUO Mobile client.
const DEVICE_PAYLOAD = {
  jailbroken: "false",
  architecture: "arm64",
  region: "US",
  app_id: "com.duosecurity.duomobile",
  full_disk_encryption: "true",
  passcode_status: "true",
  platform: "Android",
  app_version: "4.33.0",
  app_build_number: "433000",
  version: "13",
  manufacturer: "Google",
  language: "en",
  model: "Cheetah",
  security_patch_level: "2024-01-01",
} as const;

/**
 * Extract the `CODE-BASE64HOST` activation value from a QR-code value.
 *
 * The QR value can be:
 *  - a bare `CODE-BASE64HOST` value (typed in manually), returned as-is;
 *  - a QR URL like `.../frame/qr?value=CODE-BASE64HOST`, whose `value` query
 *    parameter is the activation value; or
 *  - an older activation page URL whose HTML contains an
 *    `<input value="CODE-BASE64HOST">`, which we fetch and scrape.
 */
export async function resolveActivationValue(qrValue: string): Promise<string> {
  const trimmed = qrValue.trim();

  // Bare `CODE-BASE64HOST` value — nothing to resolve.
  if (!/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }

  // Modern QR URLs carry the value directly in the `value` query parameter.
  const fromQuery = new URL(trimmed).searchParams.get("value");
  if (fromQuery !== null && fromQuery !== "") {
    debug("activation value from query param: %s", fromQuery);
    return fromQuery;
  }

  // Fall back to fetching the page and scraping the `<input value="...">`.
  debug("fetching activation page: %s", trimmed);
  const res = await fetch(trimmed);
  const html = await res.text();
  const match = /<input[^>]*\bvalue="([^"]+)"/i.exec(html);
  if (match?.[1] === undefined) {
    throw new Error(
      "Could not find the activation code on the QR page. Pass the QR value directly (CODE-BASE64HOST).",
    );
  }
  return match[1];
}

/**
 * Build the DUO activation URL from a `CODE-BASE64HOST` activation value.
 *
 * `CODE` is the activation code; `BASE64HOST` is the base64-encoded API host
 * (e.g. `api-xxxxxxxx.duosecurity.com`).
 */
export function buildActivationUrl(activationValue: string): string {
  const [code, b64host] = activationValue.split("-");
  if (code === undefined || code === "" || b64host === undefined) {
    throw new Error("Invalid activation value: expected the form CODE-BASE64HOST.");
  }

  // Restore missing base64 padding before decoding.
  const padded = b64host + "=".repeat(((-b64host.length % 4) + 4) % 4);
  const host = Buffer.from(padded, "base64").toString("utf8");
  debug("code: %s, host: %s", code, host);

  return `https://${host}/push/v2/activation/${code}?customer_protocol=1`;
}

/**
 * Activate a virtual device against the DUO API and return the customer name,
 * base32-encoded HOTP secret, and raw response body.
 */
export async function activateDevice(activationValue: string): Promise<DuoActivation> {
  const url = buildActivationUrl(activationValue);
  debug("activation url: %s", url);

  // DUO expects a device public key for push registration.
  const { publicKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
  const pubkey = publicKey.export({ type: "spki", format: "pem" }).toString();

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "User-Agent": "okhttp/2.7.5",
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      pkpush: "rsa-sha512",
      pubkey,
      ...DEVICE_PAYLOAD,
    }),
  });

  const rawResponse = await res.text();
  const json = destr(rawResponse);
  debug("api response: %O", json);

  const parsed = duoResponseSchema.safeParse(json);
  if (!parsed.success) {
    throw new Error(`DUO API did not return HOTP credentials. Response: ${rawResponse}`);
  }
  const { customer_name, hotp_secret } = parsed.data.response;

  const secret = base32.encode(Buffer.from(hotp_secret, "utf8"));
  debug("customer: %s, secret: %s", customer_name, secret);

  return { customer: customer_name, secret, response: parsed.data };
}

/**
 * Build the `otpauth://totp/...` export URI from a persisted activation
 * response, matching `duo_export.py`.
 */
export function buildExportUri(storedResponse: unknown): string {
  const parsed = duoResponseSchema.safeParse(storedResponse);
  if (!parsed.success) {
    throw new Error("Stored response is missing customer_name or hotp_secret.");
  }
  const { customer_name, hotp_secret } = parsed.data.response;

  // base32-encoded secret with padding stripped, per the otpauth spec.
  const secret = base32nopad.encode(Buffer.from(hotp_secret, "utf8"));

  const label = encodeURIComponent(customer_name);
  return `otpauth://totp/${label}?secret=${secret}&issuer=Duo&digits=6&period=30`;
}
