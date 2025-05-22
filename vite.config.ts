import { defineConfig } from "vite";
import { cloudflare } from "@cloudflare/vite-plugin";
import { env } from "node:process";

export default defineConfig({
  plugins: [cloudflare()],
  server: {
    port: 8788,
  },
  envPrefix: "BUNQ_",
  define: {
    "process.env": {
      BUNQ_CLIENT_ID: env["BUNQ_CLIENT_ID"],
      BUNQ_CLIENT_SECRET: env["BUNQ_CLIENT_SECRET"],
      IS_DEVELOPMENT: env["IS_DEVELOPMENT"],
    },
  },
});
