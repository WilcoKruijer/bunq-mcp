import { BunqContext } from "./BunqContext";
import { formatDateYYYYMMDD } from "../utils";

// Types moved from transaction-filter.ts for centralization
export interface LabelUser {
  uuid?: string | null;
  display_name?: string;
  country?: string;
  avatar?: any;
  public_nick_name?: string;
  type?: string | null;
  [key: string]: any;
}

export interface CounterpartyAlias {
  iban?: string | null;
  is_light?: boolean | null;
  display_name?: string;
  avatar?: any;
  label_user?: LabelUser;
  country?: string;
  merchant_category_code?: string;
  [key: string]: any;
}

export interface Payment {
  id: number;
  created: string;
  updated: string;
  monetary_account_id: number;
  amount: {
    value: string;
    currency: string;
  };
  payment_fee?: any;
  description: string;
  type: string;
  merchant_reference?: string | null;
  alias: any;
  counterparty_alias: CounterpartyAlias;
  attachment: any[];
  geolocation?: any;
  batch_id?: number | null;
  scheduled_id?: number | null;
  address_billing?: any;
  address_shipping?: any;
  sub_type?: string;
  payment_arrival_expected?: any;
  request_reference_split_the_bill?: any[];
  balance_after_mutation?: {
    value: string;
    currency: string;
  };
  payment_auto_allocate_instance?: any;
  payment_suspended_outgoing?: any;
}

export interface Counterparty {
  display_name?: string;
  public_nick_name?: string;
  iban?: string | null;
  type?: string;
  label_user?: LabelUser;
}

export interface UserProfile {
  id: number;
  displayName: string;
  firstName?: string;
  lastName?: string;
  email?: string;
}

export interface RequestInquiry {
  id: number;
  created: string;
  updated: string;
  time_responded: string;
  time_expiry: string;
  monetary_account_id: number;
  amount_inquired: { value: string; currency: string };
  amount_responded: { value: string; currency: string };
  user_alias_created: any;
  user_alias_revoked: any;
  counterparty_alias: any;
  description: string;
  merchant_reference: string;
  attachment: Array<{ id: number }>;
  status: string;
  batch_id: number;
  scheduled_id: number;
  minimum_age: number;
  require_address: string;
  bunqme_share_url: string;
  redirect_url: string;
  address_shipping: any;
  address_billing: any;
  geolocation: any;
  reference_split_the_bill: any;
}

export class UserAPI {
  #context: BunqContext;

  constructor(context: BunqContext) {
    this.#context = context;
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
    const start = formatDateYYYYMMDD(startDate);
    const end = formatDateYYYYMMDD(endDate);
    const url = `/user/${userId}/insights?time_start=${start}&time_end=${end}`;

    const data = await this.#context.makeSignedRequest<unknown>(url);

    return data;
  }

  async getEvents(userId: number = this.#context.token.userId) {
    const data = await this.#context.makeSignedRequest<unknown>(`/user/${userId}/event`);

    return data;
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

  async getUserSelf() {
    type UserSelfResponse = {
      Response: Array<{
        UserApiKey: {
          id: number;
          created: string;
          updated: string;
          requested_by_user: {
            UserPerson: {
              id: number;
              display_name: string;
              public_nick_name: string;
              avatar: {
                uuid: string;
                image: Array<{
                  attachment_public_uuid: string;
                  height: number;
                  width: number;
                  content_type: string;
                  urls: Array<{
                    type: string;
                    url: string;
                  }>;
                }>;
                anchor_uuid: string;
                style: string;
              };
              session_timeout: number;
            };
          };
          granted_by_user: {
            UserPerson: {
              id: number;
              display_name: string;
              public_nick_name: string;
              avatar: {
                uuid: string;
                image: Array<{
                  attachment_public_uuid: string;
                  height: number;
                  width: number;
                  content_type: string;
                  urls: Array<{
                    type: string;
                    url: string;
                  }>;
                }>;
                anchor_uuid: string;
                style: string;
              };
              session_timeout: number;
            };
          };
        };
      }>;
      Pagination: {
        future_url: string;
        newer_url: string | null;
        older_url: string | null;
      };
    };

    const data = await this.#context.makeSignedRequest<UserSelfResponse>(`/user`);
    return data;
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
   * Get request inquiries for a specific monetary account
   */
  async getRequestInquiries({
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
}
