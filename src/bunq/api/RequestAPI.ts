import { BunqContext } from "../BunqContext";
import type { RequestInquiry } from "../types";

export class RequestAPI {
  #context: BunqContext;

  constructor(context: BunqContext) {
    this.#context = context;
  }

  /**
   * Get request inquiries for a specific monetary account
   */
  async listRequestInquiries({
    userId = this.#context.token.userId,
    monetaryAccountId,
  }: {
    userId?: number;
    monetaryAccountId: number;
  }) {
    type RequestInquiryResponse = {
      Response: Array<{
        RequestInquiry: RequestInquiry;
      }>;
    };
    const url = `/user/${userId}/monetary-account/${monetaryAccountId}/request-inquiry`;
    const data = await this.#context.makeSignedRequest<RequestInquiryResponse>(url);
    return data.Response.map((item) => item.RequestInquiry);
  }

  async getRequestInquiry({
    userId = this.#context.token.userId,
    monetaryAccountId,
    itemId,
  }: {
    userId?: number;
    monetaryAccountId: number;
    itemId: number;
  }): Promise<RequestInquiry> {
    const url = `/user/${userId}/monetary-account/${monetaryAccountId}/request-inquiry/${itemId}`;
    const data = await this.#context.makeSignedRequest<{
      Response: [{ RequestInquiry: RequestInquiry }];
    }>(url, "GET");
    return data.Response[0].RequestInquiry;
  }

  async listRequestInquiryResponse({
    userId = this.#context.token.userId,
    monetaryAccountId,
  }: {
    userId?: number;
    monetaryAccountId: number;
  }): Promise<any[]> {
    const url = `/user/${userId}/monetary-account/${monetaryAccountId}/request-response`;
    const data = await this.#context.makeSignedRequest<{
      Response: any[];
    }>(url, "GET");
    return data.Response;
  }

  async updateRequestInquiry({
    userId = this.#context.token.userId,
    monetaryAccountId,
    itemId,
  }: {
    userId?: number;
    monetaryAccountId: number;
    itemId: number;
  }): Promise<RequestInquiry> {
    const url = `/user/${userId}/monetary-account/${monetaryAccountId}/request-inquiry/${itemId}`;
    const requestBody = {
      status: "ACCEPTED",
    };
    const data = await this.#context.makeSignedRequest<{
      Response: [{ RequestInquiry: RequestInquiry }];
    }>(url, "PUT", requestBody);
    console.log("RESPONSE", JSON.stringify(data, null, 2));
    return data.Response[0].RequestInquiry;
  }

  /**
   * Create a request inquiry for a specific monetary account
   * POST /v1/user/{userID}/monetary-account/{monetary-accountID}/request-inquiry
   * @param userId - User ID (optional, defaults to context)
   * @param monetaryAccountId - Monetary Account ID
   * @param body - Request body for the inquiry
   * @returns The created request inquiry ID
   */
  async createRequestInquiry({
    userId = this.#context.token.userId,
    monetaryAccountId,
    body,
  }: {
    userId?: number;
    monetaryAccountId: number;
    body: {
      amount_inquired: { value: string; currency: string };
      counterparty_alias:
        | { type: "EMAIL"; value: string; name?: string }
        | { type: "IBAN"; value: string; name?: string }
        | { type: "PHONE_NUMBER"; value: string; name?: string };
      description: string;
    };
  }): Promise<{ id: number }> {
    const url = `/user/${userId}/monetary-account/${monetaryAccountId}/request-inquiry`;
    // The Bunq API expects the body to be wrapped in an array with the key 'RequestInquiry'
    const requestBody = {
      ...body,
      counterparty_alias: {
        ...body.counterparty_alias,
      },
      allow_bunqme: false,
    };
    console.log("POSTING", url, requestBody);
    const data = await this.#context.makeSignedRequest<{ Response: [{ Id: { id: number } }] }>(
      url,
      "POST",
      requestBody,
    );
    console.log("RESPONSE", JSON.stringify(data, null, 2));
    // The response is { Id: { id: number } }
    return { id: data.Response[0].Id.id };
  }
}
