import { z } from "zod";

/**
 * A successful DUO activation nests the credentials under `response`. On
 * failure the API returns a different shape (e.g. `{ stat: "FAIL", ... }`),
 * which fails this schema and surfaces as a clear error. The same shape is
 * persisted to disk and re-read when exporting.
 */
export const duoResponseSchema = z.object({
  response: z.object({
    customer_name: z.string(),
    hotp_secret: z.string(),
  }),
});

export type DuoResponse = z.infer<typeof duoResponseSchema>;

/** The result of activating a virtual device against DUO. */
export interface DuoActivation {
  /** The DUO customer/organization name. */
  customer: string;
  /** The base32-encoded HOTP secret (padded), ready for an `otpauth://` URI. */
  secret: string;
  /** The validated activation response, persisted for later export. */
  response: DuoResponse;
}

/** Options for {@link generateTotp}. */
export interface TotpOptions {
  /** Number of digits in the generated code. Defaults to 6. */
  digits?: number;
  /** Time step in seconds. Defaults to 30. */
  period?: number;
  /** HMAC algorithm. Defaults to "sha1" (the OTP standard). */
  algorithm?: "sha1" | "sha256" | "sha512";
  /** Unix time in milliseconds. Defaults to `Date.now()`. */
  now?: number;
}
