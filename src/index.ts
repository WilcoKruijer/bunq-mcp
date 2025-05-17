import OAuthProvider from "@cloudflare/workers-oauth-provider";
import { McpAgent } from "agents/mcp";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { createOAuthHandler } from "./bunq/OAuthHandler";
import { getBunqClient, getBunqClientIfInitialized } from "./bunq/BunqClient";
import type { BunqAuthProps } from "./bunq/BunqClient";
import { registerTools } from "./tools";

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
        }
      );
    }

    // // Uncomment to enable spending report tool
    // this.server.tool(
    //   "bunqSpendingReport",
    //   "Get spending report from bunq (optionally for a date range)",
    //   {
    //     dateStart: z.string().optional().describe("Start date (YYYY-MM-DD), optional"),
    //     dateEnd: z.string().optional().describe("End date (YYYY-MM-DD), optional"),
    //   },
    //   async ({ dateStart, dateEnd }) => {
    //     let startDate: Date | undefined = dateStart ? new Date(dateStart) : undefined;
    //     let endDate: Date | undefined = dateEnd ? new Date(dateEnd) : undefined;
    //     try {
    //       const transactions = await bunqClient.payment.getInsights({
    //         dateStart: startDate,
    //         dateEnd: endDate,
    //       });
    //       return {
    //         content: [
    //           {
    //             type: "text",
    //             text: JSON.stringify(transactions),
    //           },
    //         ],
    //       };
    //     } catch (error) {
    //       console.error(error);
    //       return {
    //         content: [{ type: "text", text: `Error fetching transactions: ${error}` }],
    //         isError: true,
    //       };
    //     }
    //   },
    // );
  }
}

// Create the bunq handler
const bunqHandler = createOAuthHandler();

bunqHandler.get("/hello-world", async (c) => {
  const bunqClient = getBunqClientIfInitialized();
  if (!bunqClient) {
    return c.text("No bunq client found", 400);
  }

  const [firstAccount] = await bunqClient.account.getMonetaryBankAccounts();

  if (!firstAccount) {
    return c.text("No accounts found", 400);
  }

  const inquiries = await bunqClient.request.getRequestInquiries({
    monetaryAccountId: firstAccount.id,
  });

  return c.json({
    inquiries: inquiries[0],
  });
});

bunqHandler.get("/hello-world-2", async (c) => {
  const bunqClient = getBunqClientIfInitialized();
  if (!bunqClient) {
    return c.text("No bunq client found", 400);
  }

  const [firstAccount] = await bunqClient.account.getMonetaryBankAccounts();

  if (!firstAccount) {
    return c.text("No accounts found", 400);
  }

  const inquiries = await bunqClient.request.listRequestInquiryResponse({
    monetaryAccountId: firstAccount.id,
    // itemId: 229971615,
  });

  return c.json({
    inquiries,
  });
});

// Use type assertion to bypass type checking issues
export default new OAuthProvider({
  apiRoute: "/sse",
  apiHandler: MyMCP.mount("/sse") as any,
  defaultHandler: bunqHandler as any,
  authorizeEndpoint: "/authorize",
  tokenEndpoint: "/token",
  clientRegistrationEndpoint: "/register",
});
