import { BunqClient } from "../bunq/BunqClient";

export default function bunqAccountsTool(bunqClient: BunqClient) {
  return {
    name: "bunqAccounts",
    description: "Get accounts from bunq",
    parameters: {},
    handler: async () => {
      try {
        const accounts = await bunqClient.account.getMonetaryBankAccounts();

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
    },
  };
}