import OAuthProvider from "@cloudflare/workers-oauth-provider";
import { McpAgent } from "agents/mcp";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { createOAuthHandler } from "./bunq/OAuthHandler";
import { getBunqClient, getBunqClientIfInitialized } from "./bunq/BunqClient";
import type { BunqAuthProps } from "./bunq/BunqClient";
import { registerTools } from "./tools";
import { env as workersEnv } from "cloudflare:workers";
import cookie from "./keys/cookie.txt";

type BunqCredentials =
  | {
      type: "oauth";
      clientId: string;
      clientSecret: string;
    }
  | {
      type: "api-key";
      apiKey: string;
    };


// All of this is a shitty hack, we can revisit later.
const viteEnv = (import.meta as any).env;

const clientId =
  workersEnv["BUNQ_CLIENT_ID"] || process.env["BUNQ_CLIENT_ID"] || viteEnv.BUNQ_CLIENT_ID;
const clientSecret =
  workersEnv["BUNQ_CLIENT_SECRET"] ||
  process.env["BUNQ_CLIENT_SECRET"] ||
  viteEnv.BUNQ_CLIENT_SECRET;
const apiKey = workersEnv["BUNQ_API_KEY"] || process.env["BUNQ_API_KEY"] || viteEnv.BUNQ_API_KEY;

let credentials: BunqCredentials;

if (apiKey) {
  console.log("Using API key");
  credentials = {
    type: "api-key",
    apiKey,
  };
} else if (clientId && clientSecret) {
  console.log("Using OAuth flow with client ID and secret");
  credentials = {
    type: "oauth",
    clientId,
    clientSecret,
  };
} else {
  console.error(`
    Bunq client ID and secret or API key is not set.
    
    Please either set both a clientId and clientSecret in the following manner:
      - Set a clientId using --bunq-client-id or BUNQ_CLIENT_ID environment variable.
      - Set a clientSecret using --bunq-client-secret or BUNQ_CLIENT_SECRET environment variable.

    Or set an apiKey:
      - Set an apiKey using --bunq-api-key or BUNQ_API_KEY environment variable.

    See usage instructions at https://npmjs.com/package/bunq-mcp
  `);

  throw new Error("Bunq credentials missing.");
}

// Add the bunq props that we'll store in the token
type ExtendedProps = BunqAuthProps;

export class MyMCP extends McpAgent<ExtendedProps, Env> {
  server = new McpServer({
    name: "Bunq MCP",
    version: "1.0.0",
  });

  async init() {
    const { accessToken: oauthAccessToken, apiKeyAccessToken } = this.props as ExtendedProps;

    let accessToken = credentials.type === "oauth" ? oauthAccessToken : apiKeyAccessToken;

    if (!accessToken && credentials.type === "api-key") {
      accessToken = credentials.apiKey;
    }

    const bunqClient = getBunqClient(accessToken);
    const res = await bunqClient.initialize();

    if (credentials.type === "api-key") {
      console.log("Setting access token");
      this.props["accessToken"] = res.accessToken;
    }

    const tools = registerTools(bunqClient);
    for (const tool of tools) {
      if (tool.requiresApiKey && credentials.type === "oauth") {
        continue;
      }

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

interface WorkerExport {
  fetch(request: Request, env: any, ctx: ExecutionContext): Promise<Response>;
}

let workerExport: WorkerExport;

async function buildInstructionText() {
  let text = `bunq-mcp up and running.\n`;

  if (credentials.type === "oauth") {
    text += `\n  - Client ID: '${credentials.clientId}'`;
  } else {
    text += `\n  - API Key: (hidden)`;
  }
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

  return text;
}

if (credentials.type === "oauth") {
  const bunqHandler = createOAuthHandler(credentials.clientId, credentials.clientSecret);

  bunqHandler.get("/", async (c) => {
    return c.text(await buildInstructionText());
  });

  workerExport = new OAuthProvider({
    apiRoute: "/sse",
    apiHandler: MyMCP.mount("/sse") as any,
    defaultHandler: bunqHandler as any,
    authorizeEndpoint: "/authorize",
    tokenEndpoint: "/token",
    clientRegistrationEndpoint: "/register",
  });
} else {
  // using api key
  workerExport = {
    async fetch(request: Request, env: Env, ctx: ExecutionContext) {
      const url = new URL(request.url);

      if (url.pathname === "/sse" || url.pathname === "/sse/message") {
        // @ts-ignore
        return MyMCP.serveSSE("/sse").fetch(request, env, ctx);
      }

      if (url.pathname === "/mcp") {
        // @ts-ignore
        return MyMCP.serve("/mcp").fetch(request, env, ctx);
      }

      if (url.pathname === "/") {
        const bunqClient = getBunqClient(credentials.apiKey);
        await bunqClient.initialize();
        return new Response(await buildInstructionText());
      }

      return new Response("Not found", { status: 404 });
    },
  };
}

export default workerExport;
