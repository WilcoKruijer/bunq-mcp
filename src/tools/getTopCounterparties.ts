import { z } from "zod";
import { BunqClient } from "../bunq/BunqClient";
import { getUniquePersonCounterparties } from "../bunq/transaction-filter";

export default function getTopCounterpartiesTool(bunqClient: BunqClient) {
  return {
    name: "getTopCounterparties",
    description: "Get unique PERSON counterparties (friends) for a specific monetary account." +
      " This is based on the recent bank transactions.",
    parameters: {
      monetaryAccountId: z.number().describe("Monetary Account ID"),
    },
    handler: async ({ monetaryAccountId }: { monetaryAccountId: number }) => {
      try {
        const payments = await bunqClient.payment.getPayments({ monetaryAccountId });
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
  };
}