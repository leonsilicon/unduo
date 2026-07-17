import { expect, test } from "vite-plus/test";

import { buildActivationUrl, buildExportUri, resolveActivationValue } from "../src/duo.ts";

test("resolveActivationValue returns a bare value unchanged", async () => {
  const value = "ACTIVCODE123-YXBpLTEyMzQ1Njc4LmR1b3NlY3VyaXR5LmNvbQ";
  expect(await resolveActivationValue(value)).toBe(value);
});

test("resolveActivationValue reads the `value` query param from a QR URL", async () => {
  const value = "cHbUOPqjB7dtphTwfdQ8-YXBpLTgzMmNkZjA3LmR1b3NlY3VyaXR5LmNvbQ";
  const url = `https://api-832cdf07.duosecurity.com/frame/qr?value=${value}`;
  expect(await resolveActivationValue(url)).toBe(value);
});

test("buildActivationUrl decodes the host and builds the activation endpoint", () => {
  // "YXBpLTEyMzQ1Njc4LmR1b3NlY3VyaXR5LmNvbQ==" is base64 for
  // "api-12345678.duosecurity.com".
  const value = "ACTIVCODE123-YXBpLTEyMzQ1Njc4LmR1b3NlY3VyaXR5LmNvbQ";

  expect(buildActivationUrl(value)).toBe(
    "https://api-12345678.duosecurity.com/push/v2/activation/ACTIVCODE123?customer_protocol=1",
  );
});

test("buildActivationUrl rejects a value without a host segment", () => {
  expect(() => buildActivationUrl("ACTIVCODE123")).toThrow();
});

test("buildExportUri builds an otpauth totp URI from a stored response", () => {
  const stored = {
    response: {
      customer_name: "ACME University",
      hotp_secret: "supersecretkey",
    },
  };

  expect(buildExportUri(stored)).toBe(
    "otpauth://totp/ACME%20University?secret=ON2XAZLSONSWG4TFORVWK6I&issuer=Duo&digits=6&period=30",
  );
});

test("buildExportUri rejects a response missing credentials", () => {
  expect(() => buildExportUri({ stat: "FAIL" })).toThrow();
});
