import { z } from "zod";
import { BunqClient } from "../bunq/BunqClient";

export default function createPaymentTool(bunqClient: BunqClient) {
  return {
    name: "createPayment",
    description:
      "Create a draft payment from a specific monetary account. " +
      "You must provide exactly one of counterpartyIban, counterpartyEmail, or counterpartyPhone. " +
      "This creates a draft payment that requires review before being executed. " +
      "You can also schedule recurring payments with optional parameters.",
    parameters: {
      monetaryAccountId: z.number().describe("Monetary Account ID"),
      amount: z
        .object({
          currency: z.string().describe("Currency, e.g. 'EUR'"),
          value: z.string().describe("Amount as string, e.g. '184.80'"),
        })
        .describe("Amount object: { currency: 'EUR', value: '184.80' }"),
      description: z.string().describe("Description for the payment"),
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
      scheduleStart: z
        .string()
        .optional()
        .describe("Schedule start date in ISO format (YYYY-MM-DD) UTC"),
      scheduleEnd: z
        .string()
        .optional()
        .describe("Schedule end date in ISO format (YYYY-MM-DD) UTC, optional"),
      scheduleRecurrenceUnit: z
        .enum(["ONCE", "HOURLY", "DAILY", "WEEKLY", "MONTHLY", "YEARLY"])
        .optional()
        .describe("Recurrence unit, optional"),
      scheduleRecurrenceSize: z
        .number()
        .optional()
        .describe("Recurrence size, e.g. 1 for once per unit, optional"),
    },
    handler: async ({
      monetaryAccountId,
      amount,
      description,
      counterpartyIban,
      counterpartyEmail,
      counterpartyPhone,
      counterpartyName,
      scheduleStart,
      scheduleEnd,
      scheduleRecurrenceUnit,
      scheduleRecurrenceSize,
    }: {
      monetaryAccountId: number;
      amount: { currency: string; value: string };
      description: string;
      counterpartyIban?: string;
      counterpartyEmail?: string;
      counterpartyPhone?: string;
      counterpartyName: string;
      scheduleStart?: string;
      scheduleEnd?: string;
      scheduleRecurrenceUnit?: "ONCE" | "HOURLY" | "DAILY" | "WEEKLY" | "MONTHLY" | "YEARLY";
      scheduleRecurrenceSize?: number;
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
      let counterpartyAlias:
        | (
            | { type: "IBAN"; value: string; name?: string }
            | { type: "EMAIL"; value: string; name?: string }
            | { type: "PHONE_NUMBER"; value: string; name?: string }
          )
        | undefined;
      if (counterpartyIban) {
        counterpartyAlias = { type: "IBAN", value: counterpartyIban, name: counterpartyName };
      } else if (counterpartyEmail) {
        counterpartyAlias = { type: "EMAIL", value: counterpartyEmail, name: counterpartyName };
      } else if (counterpartyPhone) {
        counterpartyAlias = {
          type: "PHONE_NUMBER",
          value: counterpartyPhone,
          name: counterpartyName,
        };
      }
      if (!counterpartyAlias) {
        return {
          content: [{ type: "text", text: "Internal error: counterparty_alias not set." }],
          isError: true,
        };
      }
      try {
        // Create schedule object if scheduling parameters are provided
        let schedule;
        if (scheduleStart) {
          schedule = {
            time_start: scheduleStart,
            ...(scheduleEnd && { time_end: scheduleEnd }),
            ...(scheduleRecurrenceUnit && { recurrence_unit: scheduleRecurrenceUnit }),
            ...(scheduleRecurrenceSize && { recurrence_size: scheduleRecurrenceSize }),
          };
        }

        const result = await bunqClient.payment.createDraftPayment({
          monetaryAccountId,
          body: {
            amount: amount,
            counterparty_alias: counterpartyAlias,
            description,
          },
          ...(schedule && { schedule }),
        });
        return {
          content: [{ type: "text", text: JSON.stringify(result) }],
        };
      } catch (error) {
        console.error(error);
        return {
          content: [{ type: "text", text: `Error creating payment: ${error}` }],
          isError: true,
        };
      }
    },
  };
}
