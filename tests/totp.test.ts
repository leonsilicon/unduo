import { expect, test } from "vite-plus/test";

import { generateTotp } from "../src/totp.ts";

// RFC 6238 SHA-1 test vectors. The seed is the ASCII string
// "12345678901234567890", which is base32 "GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ".
const SECRET = "GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ";

test("generateTotp matches RFC 6238 test vectors", () => {
  expect(generateTotp(SECRET, { now: 59_000 })).toBe("287082");
  expect(generateTotp(SECRET, { now: 1_111_111_109_000 })).toBe("081804");
});

test("generateTotp tolerates an unpadded, lowercase secret", () => {
  const unpadded = "on2xazlsonswg4tforvwk6i";
  expect(generateTotp(unpadded, { now: 0 })).toMatch(/^\d{6}$/);
});
