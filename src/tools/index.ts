import { BunqClient } from "../bunq/BunqClient";
import bunqAccountsTool from "./bunqAccounts";
import getTransactionsTool from "./getTransactions";
import getRequestInquiriesTool from "./getRequestInquiries";
import createPaymentRequestTool from "./createPaymentRequest";
import getPaymentAutoAllocatesTool from "./getPaymentAutoAllocates";
import getTopCounterpartiesTool from "./getTopCounterparties";
import createDraftPaymentTool from "./createDraftPayment";
import createPaymentTool from "./createPayment";

export type ToolDefinition = {
  name: string;
  description: string;
  requiresApiKey?: boolean;
  parameters: any;
  handler: (...args: any[]) => Promise<any>;
};

export function registerTools(bunqClient: BunqClient): ToolDefinition[] {
  return [
    bunqAccountsTool(bunqClient),
    getTransactionsTool(bunqClient),
    getRequestInquiriesTool(bunqClient),
    createPaymentRequestTool(bunqClient),
    getPaymentAutoAllocatesTool(bunqClient),
    getTopCounterpartiesTool(bunqClient),
    createDraftPaymentTool(bunqClient),
    createPaymentTool(bunqClient),
  ];
}
