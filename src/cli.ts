#!/usr/bin/env node
import { defineCommand, runMain } from "citty";
import { consola } from "consola";
import createDebug from "debug";
import QRCode from "qrcode";
import { writeText } from "tinyclip";

import { activateDevice, buildExportUri, resolveActivationValue } from "./duo.ts";
import { loadResponse, loadSecret, resolveStoreDir, saveActivation } from "./store.ts";
import { generateTotp } from "./totp.ts";

const debug = createDebug("unduo:cli");

/** Render text as an ANSI QR code string. */
function renderQrCode(text: string): Promise<string> {
  return QRCode.toString(text, { type: "terminal", small: true });
}

const dirArg = {
  dir: {
    type: "string",
    description:
      "Directory to store/read activation state (default: the per-user data dir, or $UNDUO_DIR).",
  },
} as const;

const gen = defineCommand({
  meta: {
    name: "gen",
    description: "Generate the current TOTP code from the stored secret.",
  },
  args: { ...dirArg },
  async run({ args }) {
    const secret = await loadSecret(resolveStoreDir(args.dir));
    // Print the bare code so it stays pipeable.
    consola.log(generateTotp(secret));
  },
});

const exportCmd = defineCommand({
  meta: {
    name: "export",
    description: "Export the stored secret as an otpauth QR code for a third-party app.",
  },
  args: {
    qr: {
      type: "boolean",
      description: "Render the QR code (pass --no-qr to only print the URI).",
      default: true,
    },
    ...dirArg,
  },
  async run({ args }) {
    const response = await loadResponse(resolveStoreDir(args.dir));
    const uri = buildExportUri(response);
    debug("export uri: %s", uri);

    if (args.qr) {
      consola.log(await renderQrCode(uri));
    }
    consola.log(uri);
  },
});

const subCommands = {
  gen,
  generate: gen,
  export: exportCmd,
} as const;

const main = defineCommand({
  meta: {
    name: "unduo",
    description:
      "Un-Duo yourself by making it possible to use any 2FA application for " +
      "Duo Security authentication.",
  },
  // Activation is the root command; `gen`/`export` operate on the stored secret.
  args: {
    url: {
      type: "string",
      description: "The DUO QR code value or activation URL. Prompts if omitted.",
    },
    save: {
      type: "boolean",
      description:
        "Persist the secret to the data dir so `gen`/`export` can reuse it. Off by default.",
      default: false,
    },
    ...dirArg,
  },
  subCommands,
  async run({ args }) {
    // citty also invokes the parent `run` after a subcommand; bail if one ran.
    const [first] = args._;
    if (first !== undefined && first in subCommands) {
      return;
    }

    const input = args.url ?? (await consola.prompt("Enter QR code value or URL:"));
    if (typeof input !== "string" || input.trim() === "") {
      throw new Error("No QR code value provided.");
    }

    const activationValue = await resolveActivationValue(input);
    const activation = await activateDevice(activationValue);

    // Only persist the secret when the user explicitly opts in with `--save`.
    if (args.save) {
      const dir = resolveStoreDir(args.dir);
      await saveActivation(dir, activation.secret, activation.response);
      debug("saved activation state to %s", dir);
    }

    const uri = buildExportUri(activation.response);
    // Padding-stripped base32 key, matching what authenticator apps expect.
    const key = uri.match(/[?&]secret=([^&]+)/)?.[1] ?? activation.secret;

    // Copy the otpauth URI so it can be pasted straight into a 2FA app.
    let copied = false;
    try {
      await writeText(uri);
      copied = true;
    } catch (error) {
      debug("clipboard copy failed: %O", error);
    }

    consola.success(`Activated for ${activation.customer}`);
    if (args.save) {
      consola.info(`Secret stored in ${resolveStoreDir(args.dir)}`);
    }

    // Show the QR code and invite the user to scan it.
    consola.log("\nScan this QR code with your authenticator app:");
    consola.log(await renderQrCode(uri));

    // Print the key and URI as plain text below the QR code.
    consola.log(`Key:      ${key}`);
    consola.log(`otpauth:  ${uri}`);
    if (copied) {
      consola.log("\nCopied the otpauth URI to your clipboard.");
    }
    if (!args.save) {
      consola.log(
        "\nThe secret was not saved. Re-run with `--save` if you want `unduo gen`/`export` to reuse it.",
      );
    }
  },
});

await runMain(main);
