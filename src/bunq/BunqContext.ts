import { getPublicKey, signRequestBody } from "../utils/signature";

export interface BunqToken {
  accessToken: string;
  installationToken: string;
  sessionToken: string;
  userId: number;
  displayName: string;
}

export class BunqContext {
  #accessToken?: string;
  #retrievedToken: BunqToken | null = null;

  constructor(accessToken?: string) {
    this.#accessToken = accessToken;
  }

  get token(): BunqToken {
    if (!this.#retrievedToken) {
      throw new Error("Error getting token: Bunq context not initialized");
    }

    return this.#retrievedToken;
  }

  get userId(): number {
    if (!this.#retrievedToken) {
      throw new Error("Error getting userId: Bunq context not initialized");
    }

    return this.#retrievedToken.userId;
  }

  async initialize(): Promise<BunqToken> {
    if (this.#retrievedToken) {
      return this.#retrievedToken;
    }

    if (!this.#accessToken) {
      throw new Error("Access token required for initialization");
    }

    const pubKey = await getPublicKey();

    // 1. Create installation
    const installationToken = await this.createInstallation(pubKey);

    // 2. Register device server
    await this.registerDeviceServer(installationToken);

    // 3. Start session
    const sessionData = await this.startSession(installationToken);

    this.#retrievedToken = {
      accessToken: this.#accessToken,
      installationToken,
      sessionToken: sessionData.sessionToken,
      userId: sessionData.userId,
      displayName: sessionData.displayName,
    };

    return this.#retrievedToken;
  }

  private async createInstallation(publicKey: string): Promise<string> {
    const response = await fetch("https://api.bunq.com/v1/installation", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "bunq-mcp",
      },
      body: JSON.stringify({
        client_public_key: publicKey,
      }),
    });

    if (!response.ok) {
      throw new Error(`Installation failed: ${await response.text()}`);
    }

    interface BunqInstallationResponse {
      Response: [
        {
          Id: { id: number };
        },
        {
          Token: {
            id: number;
            created: string;
            updated: string;
            token: string;
          };
        },
        {
          ServerPublicKey: {
            server_public_key: string;
          };
        },
      ];
    }

    const data = (await response.json()) as BunqInstallationResponse;
    return data.Response[1].Token.token;
  }

  private async registerDeviceServer(installationToken: string): Promise<number> {
    if (!this.#accessToken) {
      throw new Error("Access token required for device registration");
    }

    const response = await fetch("https://api.bunq.com/v1/device-server", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Bunq-Client-Authentication": installationToken,
      },
      body: JSON.stringify({
        description: "Bunq MCP Integration",
        secret: this.#accessToken,
        permitted_ips: ["*"],
      }),
    });

    if (!response.ok) {
      throw new Error(`Device server registration failed: ${await response.text()}`);
    }

    const data = (await response.json()) as {
      Response: [{ Id: { id: number } }];
    };

    return data.Response[0].Id.id;
  }

  private async startSession(installationToken: string): Promise<{
    userId: number;
    displayName: string;
    sessionToken: string;
  }> {
    if (!this.#accessToken) {
      throw new Error("Access token required for session creation");
    }

    const body = JSON.stringify({
      secret: this.#accessToken,
    });

    const signature = await signRequestBody(body);

    const response = await fetch("https://api.bunq.com/v1/session-server", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Bunq-Client-Authentication": installationToken,
        "X-Bunq-Client-Signature": signature,
      },
      body,
    });

    if (!response.ok) {
      throw new Error(`Session creation failed: ${await response.text()}`);
    }

    const data = (await response.json()) as {
      Response: [
        any,
        {
          Token: {
            token: string;
          };
        },
        {
          UserApiKey: {
            granted_by_user: {
              UserPerson: {
                id: number;
                display_name: string;
              };
            };
          };
        },
      ];
    };

    return {
      userId: data.Response[2].UserApiKey.granted_by_user.UserPerson.id,
      displayName: data.Response[2].UserApiKey.granted_by_user.UserPerson.display_name,
      sessionToken: data.Response[1].Token.token,
    };
  }

  async makeSignedRequest<T>(endpoint: string, method: string = "GET", body?: object): Promise<T> {
    if (!this.#retrievedToken) {
      throw new Error("Failed to initialize bunq context");
    }

    const bodyStr = body ? JSON.stringify(body) : "";
    const signature = await signRequestBody(bodyStr);

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "X-Bunq-Client-Authentication": this.#retrievedToken.sessionToken,
      "X-Bunq-Client-Signature": signature,
    };

    const response = await fetch(`https://api.bunq.com/v1${endpoint}`, {
      method,
      headers,
      body: bodyStr || undefined,
    });

    if (!response.ok) {
      throw new Error(`Bunq API request failed: ${await response.text()}`);
    }

    return (await response.json()) as T;
  }
}
