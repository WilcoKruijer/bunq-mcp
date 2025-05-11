// Common API response format for bunq
export interface BunqResponse<T> {
  Response: T[];
}

// Props that will be stored in the OAuth token
export interface BunqAuthProps {
  bunqUserId: number;
  bunqDisplayName: string;
  accessToken: string;
}

// User types
export interface BunqUserPerson {
  id: number;
  created: string;
  updated: string;
  public_uuid: string;
  first_name: string;
  middle_name: string;
  last_name: string;
  legal_name: string;
  display_name: string;
  public_nick_name: string;
  alias: {
    type: string;
    value: string;
    name: string;
  }[];
  tax_resident: {
    country: string;
    tax_number: string;
  }[];
  document_type: string;
  document_number: string;
  document_country_of_issuance: string;
  address_main: {
    street: string;
    house_number: string;
    postal_code: string;
    city: string;
    country: string;
    province: string;
    apartment: string;
    floor: string;
    letter: string;
  };
  address_postal: {
    street: string;
    house_number: string;
    postal_code: string;
    city: string;
    country: string;
    province: string;
    apartment: string;
    floor: string;
    letter: string;
  };
  date_of_birth: string;
  place_of_birth: string;
  country_of_birth: string;
  nationality: string;
  language: string;
  region: string;
  gender: string;
  status: string;
  sub_status: string;
  session_timeout: number;
  daily_limit_without_confirmation_login: {
    value: string;
    currency: string;
  };
  notification_filters: {
    notification_delivery_method: string;
    notification_target: string;
    category: string;
  }[];
}

// Account types
export interface BunqMonetaryAccount {
  id: number;
  created: string;
  updated: string;
  alias: {
    type: string;
    value: string;
    name: string;
  }[];
  avatar: {
    uuid: string;
    image: {
      attachment_public_uuid: string;
      content_type: string;
      height: number;
      width: number;
    }[];
  };
  balance: {
    value: string;
    currency: string;
  };
  country: string;
  currency: string;
  daily_limit: {
    value: string;
    currency: string;
  };
  daily_spent: {
    value: string;
    currency: string;
  };
  description: string;
  public_uuid: string;
  status: string;
  sub_status: string;
  timezone: string;
  user_id: number;
  monetary_account_profile: {
    profile_fill: string;
    profile_drain: string;
    profile_action_required: string;
    profile_amount_required: {
      value: string;
      currency: string;
    };
  };
  setting: {
    color: string;
    default_avatar_status: string;
    restriction_chat: string;
    savaing_goal: {
      value: string;
      currency: string;
    };
  };
}
