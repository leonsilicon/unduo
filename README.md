# unduo

**Un-Duo yourself by making it possible to use any 2FA application for Duo
Security authentication.**

`unduo` is a command-line tool that lets you use any standard two-factor
authentication app in place of Cisco's proprietary Duo Mobile software. It
registers a virtual device with Duo, stores the OTP secret, and hands you a QR
code (and `otpauth://` URI) you can add to Google Authenticator, FreeOTP,
Aegis, 1Password, or any other authenticator app.

## Is it secure?

Yes. Duo uses the same OTP standards as every other 2FA app in the security
space — they just wrap that standard in their own software to lock you into
their app. This tool tells Duo that you are the Duo app, allowing you to
activate a 2FA key in whatever app you choose.

## Why not just use Duo?

There are many reasons you might want to avoid the Duo app, from usability to
ideology:

- You already use a 2FA app like Google Authenticator and don't want another.
- You prefer open-source or non-proprietary software.
- You are uncomfortable with the data collection in the Duo Mobile app.
- You would like Duo 2FA access on a computer, not just a mobile device that
  may die.
- You have multiple devices you would like to secure with a single 2FA
  solution.
- You would like 2FA autofill so you never have to deal with Duo notifications
  or codes.

## Install

```bash
npm install -g unduo
# or run without installing:
npx unduo <url>
```

Requires [Node.js](https://nodejs.org) 18+. There are no external binary
dependencies — QR codes are rendered in pure JS, and the whole CLI ships as a
single bundled file.

## Setup

1. Navigate to your organization's Duo Security portal.
2. Log in with your current Duo 2FA method.
3. In the security portal, select **+ Add another device**.
4. Select **Tablet**.
5. Select **Android**.
6. Select **I have Duo Mobile installed**.
7. Right-click the provided QR code and **copy the image URL** (or read the QR
   code yourself — its text is in the form `CODE-BASE64HOST`).
8. Run `unduo` and paste in the URL:

   ```bash
   npx unduo --url 'https://api-12345678.duosecurity.com/frame/qr?value=...'
   ```

   (Run `npx unduo` with no `--url` to be prompted for it instead.)

9. Scan the QR code `unduo` prints into your chosen 2FA app. If the app doesn't
   support QR codes, enter the **Key** shown below the QR code manually. The
   `otpauth://` URI is also copied to your clipboard.
10. Generate and test your first code with `unduo gen`, and you're done. (You
    can now rename the device in Duo if you like.)

## Usage

### Activate (the root command)

Register a virtual device against Duo and store its OTP secret.

```bash
unduo --url 'CODE-BASE64HOST'
# or pass the QR page URL:
unduo --url 'https://api-12345678.duosecurity.com/frame/qr?value=...'
# or run with no argument to be prompted:
unduo
```

The secret and activation response are saved to a per-user data directory (see
[State](#state)). Activation then prints a **QR code to scan**, with the base32
**key** and the `otpauth://` **URI** as plain text underneath — and copies that
URI to your clipboard, so you can add the account to any 2FA app right away.
(The clipboard copy is skipped silently in headless environments with no
clipboard tool.)

### Generate a code

```bash
unduo gen        # prints the current 6-digit TOTP code
unduo generate   # alias
```

The bare code is printed to stdout, so it is easy to pipe:

```bash
unduo gen | pbcopy
```

### Export to another app

Re-print the `otpauth://` QR code (and URI) at any time.

```bash
unduo export           # QR code + otpauth URI
unduo export --no-qr    # only the otpauth URI
```

## State

Activation writes two files — the base32 `secret` and the `response.json` —
which `gen` and `export` read back. The location is resolved in this order:

1. the `--dir <path>` flag,
2. the `$UNDUO_DIR` environment variable,
3. the platform per-user data directory (via
   [`env-paths`](https://www.npmjs.com/package/env-paths)), e.g.
   `~/Library/Application Support/unduo` on macOS or `~/.local/share/unduo` on
   Linux.

## Debug output

This tool uses [`debug`](https://www.npmjs.com/package/debug). Set `DEBUG` to
trace the activation URL, the raw Duo API response, and where state is written:

```bash
DEBUG='unduo:*' unduo --url 'CODE-BASE64HOST'
```

## Notes

- The generated codes are **TOTP** (time-based). Any standard authenticator app
  will stay in sync.
- Built on [citty](https://github.com/unjs/citty) (CLI),
  [consola](https://github.com/unjs/consola) (output/prompts),
  [otpauth](https://github.com/hectorm/otpauth) (TOTP),
  [`@scure/base`](https://github.com/paulmillr/scure-base) (base32),
  [zod](https://zod.dev) (response validation),
  [destr](https://github.com/unjs/destr) (JSON parsing),
  [unstorage](https://unstorage.unjs.io) (state persistence),
  [env-paths](https://github.com/sindresorhus/env-paths) (state directory),
  [tinyclip](https://github.com/leonsilicon/tinyclip) (clipboard),
  and [qrcode](https://github.com/soldair/node-qrcode) (QR rendering).

## Credits

`unduo` stands on the shoulders of prior work:

- [kop316/duo-cli](https://gitlab.com/kop316/duo-cli) — the Python CLI whose
  activate / generate / export flow this project ports to TypeScript.
- [nilsstreedain/duo-bypass](https://github.com/nilsstreedain/duo-bypass) —
  whose setup guide is adapted above.
- [revalo/duo-bypass](https://github.com/revalo/duo-bypass) — the original
  reverse-engineering of the Duo activation flow.

## Development

This project uses [Vite+](https://viteplus.dev) (`vp`) and [bun](https://bun.sh).

```bash
bun install             # install dependencies
vp run src/cli.ts <cmd> # run the CLI from source
vp test                 # run the unit tests
vp check                # format, lint and type-check
vp pack                 # build the single-file bundle to dist/
```

## Disclaimer

This tool is intended for legitimate use with accounts you control (for
example, to use an open source authenticator instead of Duo Mobile). Do not use
it against accounts you are not authorized to access.

## License

[MIT](./LICENSE)
