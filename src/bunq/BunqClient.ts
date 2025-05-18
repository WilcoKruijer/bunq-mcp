import { BunqContext } from "./BunqContext";
import { AccountAPI } from "./api/AccountAPI";
import { PaymentAPI } from "./api/PaymentAPI";
import { RequestAPI } from "./api/RequestAPI";
import { UserProfileAPI } from "./api/UserProfileAPI";

export interface BunqAuthProps {
  accessToken?: string;
  apiKeyAccessToken?: string;
}

export class BunqClient {
  private context: BunqContext;
  private _account!: AccountAPI;
  private _payment!: PaymentAPI;
  private _request!: RequestAPI;
  private _profile!: UserProfileAPI;

  constructor(accessToken?: string) {
    this.context = new BunqContext(accessToken);
    this.initializeAPIs();
  }

  private initializeAPIs() {
    this._account = new AccountAPI(this.context);
    this._payment = new PaymentAPI(this.context);
    this._request = new RequestAPI(this.context);
    this._profile = new UserProfileAPI(this.context);
  }

  setAccessToken(accessToken: string) {
    this.context = new BunqContext(accessToken);
    this.initializeAPIs();
  }

  get account() {
    return this._account;
  }

  get payment() {
    return this._payment;
  }

  get request() {
    return this._request;
  }

  get profile() {
    return this._profile;
  }

  async initialize() {
    return this.context.initialize();
  }
}

// Export a singleton instance for use throughout the app
let bunqClient: BunqClient | null = null;

export function getBunqClient(accessToken?: string): BunqClient {
  if (!bunqClient) {
    bunqClient = new BunqClient(accessToken);
  } else if (accessToken) {
    bunqClient.setAccessToken(accessToken);
  }

  return bunqClient;
}

export function getBunqClientIfInitialized(): BunqClient | null {
  return bunqClient;
}
