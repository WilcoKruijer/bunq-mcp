import OAuthProvider from "@cloudflare/workers-oauth-provider";
import { McpAgent } from "agents/mcp";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { createOAuthHandler } from "./bunq/OAuthHandler";
import { getBunqClient, getBunqClientIfInitialized } from "./bunq/BunqClient";
import type { BunqAuthProps } from "./bunq/BunqClient";
import { registerTools } from "./tools";
import { env as workersEnv } from "cloudflare:workers";
import cookie from "./keys/cookie.txt";

const clientId = workersEnv["BUNQ_CLIENT_ID"] || process.env["BUNQ_CLIENT_ID"];
const clientSecret = workersEnv["BUNQ_CLIENT_SECRET"] || process.env["BUNQ_CLIENT_SECRET"];

if (!clientId) {
  throw new Error(
    "Bunq client ID is not set. Please set it using --bunq-client-id or BUNQ_CLIENT_ID environment variable.",
  );
}

if (!clientSecret) {
  throw new Error(
    "Bunq client secret is not set. Please set it using --bunq-client-secret or BUNQ_CLIENT_SECRET environment variable.",
  );
}

// Add the bunq props that we'll store in the token
type ExtendedProps = BunqAuthProps;

export class MyMCP extends McpAgent<ExtendedProps, Env> {
  server = new McpServer({
    name: "Bunq MCP Integration",
    version: "1.0.0",
  });

  async init() {
    const accessToken = this.props["accessToken"] + "";
    console.log("accessToken", accessToken);

    const bunqClient = getBunqClient(accessToken);
    await bunqClient.initialize();

    // Register all tools
    const tools = registerTools(bunqClient);
    for (const tool of tools) {
      this.server.tool(
        tool.name,
        tool.description,
        tool.parameters,
        async (args: any, extra: any) => {
          // We need to properly handle the args and wrap handler for type safety
          return await tool.handler(args, extra);
        },
      );
    }
  }
}

// Create the bunq handler
const bunqHandler = createOAuthHandler(clientId, clientSecret);

bunqHandler.get("/", async (c) => {
  let text = `bunq-mcp up and running.\n`;

  text += `\n  - Client ID: '${clientId}'`;
  text += `\n  - Cookie: '${cookie}'`;
  const bunqClient = getBunqClientIfInitialized();

  if (bunqClient) {
    text += `\n\nBunq client initialized successfully.`;

    const [firstAccount] = await bunqClient.account.getMonetaryBankAccounts();
    if (firstAccount) {
      text += `\n  - Found Bunq account: '${firstAccount.description}'`;
    } else {
      text += `\n  - No Bunq (monetary bank) accounts found`;
    }
  } else {
    text += `\n\nBunq client NOT initialized.`;
  }

  text += `\n\nSee usage instructions at https://npmjs.com/package/bunq-mcp`;

  return c.text(text);
});

export default new OAuthProvider({
  apiRoute: "/sse",
  apiHandler: MyMCP.mount("/sse") as any,
  defaultHandler: bunqHandler as any,
  authorizeEndpoint: "/authorize",
  tokenEndpoint: "/token",
  clientRegistrationEndpoint: "/register",
});
