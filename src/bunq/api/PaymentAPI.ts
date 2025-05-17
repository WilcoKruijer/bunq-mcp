import { BunqContext } from "../BunqContext";
import { Payment } from "../types";

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
      return date.toISOString().split('T')[0];
    };
    
    const start = formatDateYYYYMMDD(startDate);
    const end = formatDateYYYYMMDD(endDate);
    const url = `/user/${userId}/insights?time_start=${start}&time_end=${end}`;

    const data = await this.#context.makeSignedRequest<unknown>(url);

    return data;
  }
}