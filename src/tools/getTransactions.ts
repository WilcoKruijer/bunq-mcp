import { z } from "zod";
import { BunqClient } from "../bunq/BunqClient";
import { mapPaymentsToHumanReadable } from "../bunq/transaction-filter";

export default function getTransactionsTool(bunqClient: BunqClient) {
  return {
    name: "getTransactions",
    description: "Get transactions (payments) for a specific monetary account. Get accounts first to get the ID.",
    parameters: {
      monetaryAccountId: z.number().describe("Monetary Account ID"),
    },
    handler: async ({ monetaryAccountId }: { monetaryAccountId: number }) => {
      try {
        const payments = await bunqClient.payment.getPayments({ monetaryAccountId });
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
  };
}