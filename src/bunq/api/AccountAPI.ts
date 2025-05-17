import { BunqContext } from "../BunqContext";

export class AccountAPI {
  #context: BunqContext;

  constructor(context: BunqContext) {
    this.#context = context;
  }

  async getMonetaryBankAccounts(userId: number = this.#context.token.userId) {
    type AccountResponse = {
      Response: Array<{
        MonetaryAccountBank: {
          id: number;
          description: string;
          balance: {
            value: string;
            currency: string;
          };
        };
      }>;
    };

    const data = await this.#context.makeSignedRequest<AccountResponse>(
      `/user/${userId}/monetary-account-bank`,
    );

    return data.Response.map((item) => ({
      id: item.MonetaryAccountBank.id,
      description: item.MonetaryAccountBank.description,
      balance: item.MonetaryAccountBank.balance.value,
      currency: item.MonetaryAccountBank.balance.currency,
    }));
  }

  /**
   * Get payment auto-allocate objects for a specific monetary account (focused fields only)
   */
  async getPaymentAutoAllocates({
    userId = this.#context.token.userId,
    monetaryAccountId,
  }: {
    userId?: number;
    monetaryAccountId: number;
  }) {
    type PaymentAutoAllocateResponse = {
      Response: Array<{
        PaymentAutoAllocate: {
          id: number;
          created: string;
          updated: string;
          type: string;
          status: string;
          trigger_amount: { value: string; currency: string };
          payment: any;
        };
      }>;
    };
    const url = `/user/${userId}/monetary-account/${monetaryAccountId}/payment-auto-allocate`;
    const data = await this.#context.makeSignedRequest<PaymentAutoAllocateResponse>(url);
    // Only return the focused fields
    return data.Response.map((item) => ({
      id: item.PaymentAutoAllocate.id,
      created: item.PaymentAutoAllocate.created,
      updated: item.PaymentAutoAllocate.updated,
      type: item.PaymentAutoAllocate.type,
      status: item.PaymentAutoAllocate.status,
      trigger_amount: item.PaymentAutoAllocate.trigger_amount,
      payment: item.PaymentAutoAllocate.payment,
    }));
  }
}