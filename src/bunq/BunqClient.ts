import { BunqContext } from "./BunqContext";
import { UserAPI } from "./UserAPI";

export class BunqClient {
  private context: BunqContext;
  private _user: UserAPI;

  constructor(accessToken?: string) {
    this.context = new BunqContext(accessToken);
    this._user = new UserAPI(this.context);
  }

  setAccessToken(accessToken: string) {
    this.context = new BunqContext(accessToken);
    this._user = new UserAPI(this.context);
  }

  get user() {
    return this._user;
  }

  // Additional API modules can be added here as needed
  // For example:
  // get payments() { return this._payments; }

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
