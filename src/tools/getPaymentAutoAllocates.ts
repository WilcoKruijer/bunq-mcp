import { z } from "zod";
import { BunqClient } from "../bunq/BunqClient";

export default function getPaymentAutoAllocatesTool(bunqClient: BunqClient) {
  return {
    name: "getPaymentAutoAllocates",
    description: "Get payment auto-allocate objects for a specific monetary account. Get accounts first to get the ID.",
    parameters: {
      monetaryAccountId: z.number().describe("Monetary Account ID"),
    },
    handler: async ({ monetaryAccountId }: { monetaryAccountId: number }) => {
      try {
        const autoAllocates = await bunqClient.account.getPaymentAutoAllocates({
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
  };
}