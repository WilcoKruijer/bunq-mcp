import OAuthProvider from "@cloudflare/workers-oauth-provider";
import { McpAgent } from "agents/mcp";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { createOAuthHandler } from "./bunq/OAuthHandler";
import { getBunqClient } from "./bunq";
import type { BunqAuthProps } from "./bunq";
import {
  getUniquePersonCounterparties,
  mapPaymentsToHumanReadable,
} from "./bunq/transaction-filter";

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
    // Simple addition example
    this.server.tool(
      "add",
      "Add two numbers the way only MCP can",
      { a: z.number(), b: z.number() },
      async ({ a, b }) => ({
        content: [{ type: "text", text: String(a + b) }],
      }),
    );

    // Use bunqClient to get user info
    this.server.tool("bunqAccounts", "Get accounts from bunq", {}, async () => {
      try {
        const accounts = await bunqClient.user.getMonetaryBankAccounts();

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(accounts),
            },
          ],
        };
      } catch (error) {
        console.error(error);
        return {
          content: [{ type: "text", text: `Error fetching user info: ${error}` }],
          isError: true,
        };
      }
    });

    // Tool to get transactions
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
    //       const transactions = await bunqClient.user.getInsights({
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

    // Tool to get transactions for a specific monetary account
    this.server.tool(
      "getTransactions",
      "Get transactions (payments) for a specific monetary account. Get accounts first to get the ID.",
      {
        monetaryAccountId: z.number().describe("Monetary Account ID"),
      },
      async ({ monetaryAccountId }) => {
        try {
          const payments = await bunqClient.user.getPayments({ monetaryAccountId });
          const readable = mapPaymentsToHumanReadable(payments);
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(readable),
              },
            ],
          };
        } catch (error) {
          console.error(error);
          return {
            content: [{ type: "text", text: `Error fetching payments: ${error}` }],
            isError: true,
          };
        }
      },
    );

    // Tool to get request inquiries for a specific monetary account
    this.server.tool(
      "getRequestInquiries",
      "Get request inquiries for a specific monetary account. Get accounts first to get the ID.",
      {
        monetaryAccountId: z.number().describe("Monetary Account ID"),
      },
      async ({ monetaryAccountId }) => {
        try {
          const inquiries = await bunqClient.user.getRequestInquiries({ monetaryAccountId });
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(inquiries),
              },
            ],
          };
        } catch (error) {
          console.error(error);
          return {
            content: [{ type: "text", text: `Error fetching request inquiries: ${error}` }],
            isError: true,
          };
        }
      },
    );

    // Tool to create a request inquiry for a specific monetary account
    this.server.tool(
      "createPaymentRequest",
      "Create a payment request to add funds to a specific monetary account. " +
        "You must provide exactly one of counterpartyIban, counterpartyEmail, or counterpartyPhone.",
      {
        monetaryAccountId: z.number().describe("Monetary Account ID"),
        amount: z
          .object({
            currency: z.string().describe("Currency, e.g. 'EUR'"),
            value: z.string().describe("Amount as string, e.g. '184.80'"),
          })
          .describe("Amount object: { currency: 'EUR', value: '184.80' }"),
        description: z.string().describe("Description for the request inquiry"),
        counterpartyIban: z
          .string()
          .optional()
          .describe(
            "Counterparty IBAN (optional, but exactly one of IBAN, Email, or Phone must be set)",
          ),
        counterpartyEmail: z
          .string()
          .optional()
          .describe(
            "Counterparty Email (optional, but exactly one of IBAN, Email, or Phone must be set)",
          ),
        counterpartyPhone: z
          .string()
          .optional()
          .describe(
            "Counterparty Phone (optional, but exactly one of IBAN, Email, or Phone must be set)",
          ),
        counterpartyName: z.string().describe("Counterparty display name (used for all types)"),
      },
      async ({
        monetaryAccountId,
        amount,
        description,
        counterpartyIban,
        counterpartyEmail,
        counterpartyPhone,
        counterpartyName,
      }) => {
        // Validate that exactly one counterparty field is set
        const provided = [counterpartyIban, counterpartyEmail, counterpartyPhone].filter(Boolean);
        if (provided.length !== 1) {
          return {
            content: [
              {
                type: "text",
                text: "You must provide exactly one of counterpartyIban, counterpartyEmail, or counterpartyPhone.",
              },
            ],
            isError: true,
          };
        }
        let counterparty_alias:
          | (
              | { type: "IBAN"; value: string; name?: string }
              | { type: "EMAIL"; value: string; name?: string }
              | { type: "PHONE_NUMBER"; value: string; name?: string }
            )
          | undefined;
        if (counterpartyIban) {
          counterparty_alias = { type: "IBAN", value: counterpartyIban, name: counterpartyName };
        } else if (counterpartyEmail) {
          counterparty_alias = { type: "EMAIL", value: counterpartyEmail, name: counterpartyName };
        } else if (counterpartyPhone) {
          counterparty_alias = {
            type: "PHONE_NUMBER",
            value: counterpartyPhone,
            name: counterpartyName,
          };
        }
        if (!counterparty_alias) {
          return {
            content: [{ type: "text", text: "Internal error: counterparty_alias not set." }],
            isError: true,
          };
        }
        try {
          const result = await bunqClient.user.createRequestInquiry({
            monetaryAccountId,
            body: {
              amount_inquired: amount,
              counterparty_alias,
              description,
            },
          });
          return {
            content: [{ type: "text", text: JSON.stringify(result) }],
          };
        } catch (error) {
          console.error(error);
          return {
            content: [{ type: "text", text: `Error creating request inquiry: ${error}` }],
            isError: true,
          };
        }
      },
    );

    // Tool to get payment auto-allocate objects for a specific monetary account
    this.server.tool(
      "getPaymentAutoAllocates",
      "Get payment auto-allocate objects for a specific monetary account. Get accounts first to get the ID.",
      {
        monetaryAccountId: z.number().describe("Monetary Account ID"),
      },
      async ({ monetaryAccountId }) => {
        try {
          const autoAllocates = await bunqClient.user.getPaymentAutoAllocates({
            monetaryAccountId,
          });
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(autoAllocates),
              },
            ],
          };
        } catch (error) {
          console.error(error);
          return {
            content: [{ type: "text", text: `Error fetching payment auto-allocates: ${error}` }],
            isError: true,
          };
        }
      },
    );

    // Tool to get unique PERSON counterparties (friends)
    this.server.tool(
      "getTopCounterparties",
      "Get unique PERSON counterparties (friends) for a specific monetary account." +
        " This is based on the recent bank transactions.",
      {
        monetaryAccountId: z.number().describe("Monetary Account ID"),
      },
      async ({ monetaryAccountId }) => {
        try {
          const payments = await bunqClient.user.getPayments({ monetaryAccountId });
          const friends = getUniquePersonCounterparties(payments);
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(friends),
              },
            ],
          };
        } catch (error) {
          console.error(error);
          return {
            content: [{ type: "text", text: `Error fetching friends: ${error}` }],
            isError: true,
          };
        }
      },
    );
  }
}

// Create the bunq handler
const bunqHandler = createOAuthHandler();

// Use type assertion to bypass type checking issues
export default new OAuthProvider({
  apiRoute: "/sse",
  apiHandler: MyMCP.mount("/sse") as any,
  defaultHandler: bunqHandler as any,
  authorizeEndpoint: "/authorize",
  tokenEndpoint: "/token",
  clientRegistrationEndpoint: "/register",
});
