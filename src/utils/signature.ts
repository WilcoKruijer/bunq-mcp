import { env } from "cloudflare:workers";

import devPublicKey from "../keys/dev-public-bunq-key.pub.txt";
import devPrivateKey from "../keys/dev-private-bunq-key.pem.txt";

export async function getPublicKey(): Promise<string> {
  if (!env.IS_DEVELOPMENT) {
    throw new Error("Public key is not available in production.");
  }

  return devPublicKey;
}

export async function getPrivateKey(): Promise<CryptoKey> {
  if (!env.IS_DEVELOPMENT) {
    throw new Error(
      "Private key is not available in production. Need to setup code to load it from r2 bucket.",
    );
  }

  // Remove PEM header, footer and newlines
  const privateKeyBase64 = devPrivateKey
    .replace("-----BEGIN PRIVATE KEY-----", "")
    .replace("-----END PRIVATE KEY-----", "")
    .replace(/\n/g, "");

  // Convert base64 to ArrayBuffer
  const privateKeyBinary = Uint8Array.from(atob(privateKeyBase64), (c) => c.charCodeAt(0));

  // Import the key
  return crypto.subtle.importKey(
    "pkcs8",
    privateKeyBinary,
    {
      name: "RSASSA-PKCS1-v1_5",
      hash: "SHA-256",
    },
    false,
    ["sign"],
  );
}

/**
 * Signs data using RSA-SHA256
 * @param privateKey - The CryptoKey for signing
 * @param data - The data to sign (string or ArrayBuffer)
 * @returns A promise resolving to the signature as a base64 string
 */
export async function signData(privateKey: CryptoKey, data: string | ArrayBuffer): Promise<string> {
  // Convert string to ArrayBuffer if needed
  const dataBuffer = typeof data === "string" ? new TextEncoder().encode(data) : data;

  // Sign the data
  const signatureBuffer = await crypto.subtle.sign(
    {
      name: "RSASSA-PKCS1-v1_5",
    },
    privateKey,
    dataBuffer,
  );

  // Convert ArrayBuffer to base64
  return btoa(String.fromCharCode(...new Uint8Array(signatureBuffer)));
}

export async function signRequestBody(body: string | ArrayBuffer): Promise<string> {
  const privateKey = await getPrivateKey();
  return signData(privateKey, body);
}
