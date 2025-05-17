import { z } from "zod";
import { BunqClient } from "../bunq/BunqClient";

export default function getRequestInquiriesTool(bunqClient: BunqClient) {
  return {
    name: "getRequestInquiries",
    description: "Get request inquiries for a specific monetary account. Get accounts first to get the ID.",
    parameters: {
      monetaryAccountId: z.number().describe("Monetary Account ID"),
    },
    handler: async ({ monetaryAccountId }: { monetaryAccountId: number }) => {
      try {
        const inquiries = await bunqClient.request.listRequestInquiries({ monetaryAccountId });
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
  };
}