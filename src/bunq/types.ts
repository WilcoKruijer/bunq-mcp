// Types moved from UserAPI.ts for centralization
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
