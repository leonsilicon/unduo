import { Secret, TOTP } from "otpauth";

import type { TotpOptions } from "./entities.ts";

const ALGORITHMS = {
  sha1: "SHA1",
  sha256: "SHA256",
  sha512: "SHA512",
} as const;

/**
 * Generate a TOTP code (RFC 6238) from a base32-encoded secret, matching
 * `pyotp.TOTP(secret).now()`. The secret may be unpadded or lowercase.
 */
export function generateTotp(secret: string, options: TotpOptions = {}): string {
  const { digits = 6, period = 30, algorithm = "sha1", now } = options;

  const totp = new TOTP({
    secret: Secret.fromBase32(secret.toUpperCase().replace(/=+$/, "")),
    algorithm: ALGORITHMS[algorithm],
    digits,
    period,
    issuer: "Duo",
  });

  return totp.generate(now === undefined ? undefined : { timestamp: now });
}
