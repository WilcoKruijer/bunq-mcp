import { BunqClient } from "../bunq/BunqClient";
import bunqAccountsTool from "./bunqAccounts";
import getTransactionsTool from "./getTransactions";
import getRequestInquiriesTool from "./getRequestInquiries";
import createPaymentRequestTool from "./createPaymentRequest";
import getPaymentAutoAllocatesTool from "./getPaymentAutoAllocates";
import getTopCounterpartiesTool from "./getTopCounterparties";
import createPaymentTool from "./createPayment";

export type ToolDefinition = {
  name: string;
  description: string;
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
    createPaymentTool(bunqClient),
  ];
}
