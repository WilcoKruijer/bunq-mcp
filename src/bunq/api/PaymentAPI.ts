import { BunqContext } from "../BunqContext";
import type { Payment } from "../types";

export class PaymentAPI {
  #context: BunqContext;

  constructor(context: BunqContext) {
    this.#context = context;
  }

  /**
   * Get payments for a specific monetary account
   */
  async getPayments({
    userId = this.#context.token.userId,
    monetaryAccountId,
  }: {
    userId?: number;
    monetaryAccountId: number;
  }) {
    type PaymentResponse = {
      Response: Array<{
        Payment: Payment;
      }>;
    };
    const url = `/user/${userId}/monetary-account/${monetaryAccountId}/payment?count=200`;
    const data = await this.#context.makeSignedRequest<PaymentResponse>(url);
    return data.Response.map((item) => item.Payment);
  }

  /**
   * Create a payment from a specific monetary account
   * POST /v1/user/{userID}/monetary-account/{monetary-accountID}/payment
   * @param userId - User ID (optional, defaults to context)
   * @param monetaryAccountId - Monetary Account ID
   * @param body - Request body for the payment
   * @returns The created payment details
   */
  async createPayment({
    userId = this.#context.token.userId,
    monetaryAccountId,
    body,
  }: {
    userId?: number;
    monetaryAccountId: number;
    body: {
      amount: { value: string; currency: string };
      counterparty_alias:
        | { type: "EMAIL"; value: string; name?: string }
        | { type: "IBAN"; value: string; name?: string }
        | { type: "PHONE_NUMBER"; value: string; name?: string };
      description: string;
    };
  }): Promise<{ id: number }> {
    const url = `/user/${userId}/monetary-account/${monetaryAccountId}/payment`;
    const requestBody = {
      ...body,
      counterparty_alias: {
        ...body.counterparty_alias,
      },
    };

    const data = await this.#context.makeSignedRequest<{ Response: [{ Id: { id: number } }] }>(
      url,
      "POST",
      requestBody,
    );

    return { id: data.Response[0].Id.id };
  }

  /**
   * Create a draft payment from a specific monetary account
   * POST /v1/user/{userID}/monetary-account/{monetary-accountID}/draft-payment
   * @param userId - User ID (optional, defaults to context)
   * @param monetaryAccountId - Monetary Account ID
   * @param body - Request body for the draft payment
   * @param schedule - Optional scheduling information
   * @returns The created draft payment details
   */
  async createDraftPayment({
    userId = this.#context.token.userId,
    monetaryAccountId,
    body,
    schedule,
  }: {
    userId?: number;
    monetaryAccountId: number;
    body: {
      amount: { value: string; currency: string };
      counterparty_alias:
        | { type: "EMAIL"; value: string; name?: string }
        | { type: "IBAN"; value: string; name?: string }
        | { type: "PHONE_NUMBER"; value: string; name?: string };
      description: string;
    };
    schedule?: {
      time_start: string;
      time_end?: string;
      recurrence_unit?: "ONCE" | "HOURLY" | "DAILY" | "WEEKLY" | "MONTHLY" | "YEARLY";
      recurrence_size?: number;
    };
  }): Promise<{ id: number }> {
    const url = `/user/${userId}/monetary-account/${monetaryAccountId}/draft-payment`;

    const requestBody = {
      status: "ACTIVE",
      entries: [
        {
          amount: body.amount,
          counterparty_alias: body.counterparty_alias,
          description: body.description,
        },
      ],
      number_of_required_accepts: 1,
      ...(schedule && { schedule }),
    };

    const data = await this.#context.makeSignedRequest<{ Response: [{ Id: { id: number } }] }>(
      url,
      "POST",
      requestBody,
    );

    return { id: data.Response[0].Id.id };
  }

  /**
   * Create a real payment from a specific monetary account
   * POST /v1/user/{userID}/monetary-account/{monetary-accountID}/payment
   * @param userId - User ID (optional, defaults to context)
   * @param monetaryAccountId - Monetary Account ID
   * @param body - Request body for the payment
   * @returns The created payment details
   */
  async createRealPayment({
    userId = this.#context.token.userId,
    monetaryAccountId,
    body,
  }: {
    userId?: number;
    monetaryAccountId: number;
    body: {
      amount: { value: string; currency: string };
      counterparty_alias:
        | { type: "EMAIL"; value: string; name?: string }
        | { type: "IBAN"; value: string; name?: string }
        | { type: "PHONE_NUMBER"; value: string; name?: string };
      description: string;
    };
  }): Promise<{ id: number }> {
    const url = `/user/${userId}/monetary-account/${monetaryAccountId}/payment`;
    const requestBody = {
      ...body,
      counterparty_alias: {
        ...body.counterparty_alias,
      },
    };

    const data = await this.#context.makeSignedRequest<{ Response: [{ Id: { id: number } }] }>(
      url,
      "POST",
      requestBody,
    );

    return { id: data.Response[0].Id.id };
  }

  async getInsights({
    userId,
    dateStart,
    dateEnd,
  }: {
    userId?: number;
    dateStart?: Date;
    dateEnd?: Date;
  }) {
    userId = userId ?? this.#context.token.userId;
    let endDate = dateEnd ? new Date(dateEnd) : new Date();
    // Set time to 00:00:00 for consistency
    endDate.setHours(0, 0, 0, 0);
    let startDate = dateStart ? new Date(dateStart) : new Date(endDate);
    if (!dateStart) {
      startDate.setDate(endDate.getDate() - 6); // 6 days before end, inclusive
    }

    // We need formatDateYYYYMMDD which was imported in UserAPI.ts
    // For this refactoring, let's just implement it inline
    const formatDateYYYYMMDD = (date: Date): string => {
      return date.toISOString().split("T")[0];
    };

    const start = formatDateYYYYMMDD(startDate);
    const end = formatDateYYYYMMDD(endDate);
    const url = `/user/${userId}/insights?time_start=${start}&time_end=${end}`;

    const data = await this.#context.makeSignedRequest<unknown>(url);

    return data;
  }
}
