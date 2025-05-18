#!/usr/bin/env node

// @ts-check

import { env } from "node:process";
import { spawn, spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { readFile, writeFile } from "node:fs/promises";
import { parseArgs } from "node:util";

const __dirname = dirname(fileURLToPath(import.meta.url));

const {
  values: {
    help,
    "generate-keys": generateKeys,
    mcp,
    host,
    port,
    "bunq-client-id": bunqClientId,
    "bunq-client-secret": bunqClientSecret,
    "bunq-api-key": bunqApiKey,
    version,
  },
} = parseArgs({
  options: {
    help: { type: "boolean" },
    "generate-keys": { type: "boolean" },
    mcp: { type: "boolean" },
    host: { type: "string" },
    port: { type: "string", short: "p" },
    "bunq-client-id": { type: "string" },
    "bunq-client-secret": { type: "string" },
    version: { type: "boolean", short: "v" },
    "bunq-api-key": { type: "string" },
  },
});

let hasArgs = false;

async function printHelp() {
  await printVersion();
  console.log("\nUsage: bunq-mcp [options]\n");
  console.log("Options:");
  console.log("  --help              Show help");
  console.log("  --version           Show version");
  console.log("  --generate-keys     Generate private and public key pair for Bunq installation");
  console.log("  --mcp               Start MCP server");
  console.log("  --host <host>       Host (for MCP server)");
  console.log("  --port <port>       Port (for MCP server)");
  console.log(
    "  --bunq-client-id <id>         Bunq client ID (alternative to BUNQ_CLIENT_ID env var)",
  );
  console.log(
    "  --bunq-client-secret <secret> Bunq client secret (alternative to BUNQ_CLIENT_SECRET env var)",
  );
  console.log("  --bunq-api-key <key>          Bunq API key (alternative to BUNQ_API_KEY env var)");

  console.log("");
  console.log("Hint:");
  console.log("  - Either an api key needs to be set, or a client id AND secret.");
}

async function printVersion() {
  const packageJson = await readFile(join(__dirname, "../package.json"), "utf-8");
  const { version } = JSON.parse(packageJson);
  console.log(`\nBunq MCP v${version}\n`);
}

if (help) {
  hasArgs = true;
  await printHelp();
  process.exit(0);
}

if (version) {
  hasArgs = true;
  await printVersion();
  process.exit(0);
}

if (generateKeys) {
  hasArgs = true;
  const keysDir = join(__dirname, "../src/keys");
  const privKey = join(keysDir, "dev-private-bunq-key.pem.txt");
  const pubKey = join(keysDir, "dev-public-bunq-key.pub.txt");
  const cookieFile = join(keysDir, "cookie.txt");

  // Generate private key
  const genPriv = spawnSync("openssl", ["genrsa", "-out", privKey], { stdio: "inherit" });
  if (genPriv.status !== 0) {
    process.exit(genPriv.status);
  }
  // Generate public key from private key
  const genPub = spawnSync(
    "openssl",
    ["rsa", "-in", privKey, "-outform", "PEM", "-pubout", "-out", pubKey],
    { stdio: "inherit" },
  );
  if (genPub.status !== 0) {
    process.exit(genPub.status);
  }
  // Generate cookie
  const genCookie = spawnSync("openssl", ["rand", "-hex", "32"], { stdio: "pipe" });
  if (genCookie.status !== 0) {
    process.exit(genCookie.status);
  }
  const cookie = genCookie.stdout.toString().trim();
  await writeFile(cookieFile, cookie);

  console.log(`Keys generated at '${privKey}' and '${pubKey}'`);
  console.log(`Cookie generated at '${cookieFile}'`);
}

if (mcp) {
  hasArgs = true;

  const clientId = bunqClientId || env["BUNQ_CLIENT_ID"];
  const clientSecret = bunqClientSecret || env["BUNQ_CLIENT_SECRET"];
  const apiKey = bunqApiKey || env["BUNQ_API_KEY"];

  console.log("Starting MCP server");
  const viteArgs = ["vite", "--config", join(__dirname, "../vite.config.ts")];
  if (host) {
    viteArgs.push("--host", host);
  }
  if (port) {
    viteArgs.push("--port", port);
  }
  const vite = spawn("npx", viteArgs, {
    stdio: "inherit",
    shell: true,
    cwd: join(__dirname, "../"),
    env: {
      ...env,
      BUNQ_CLIENT_ID: clientId,
      BUNQ_CLIENT_SECRET: clientSecret,
      BUNQ_API_KEY: apiKey,
    },
  });

  // Handle Ctrl+C (SIGINT) to stop vite
  process.on("SIGINT", () => {
    if (vite) {
      vite.kill("SIGINT");
    }
    process.exit(0);
  });

  vite.on("exit", (code) => {
    process.exit(code);
  });
}

if (!hasArgs) {
  await printHelp();
  process.exit(1);
}
