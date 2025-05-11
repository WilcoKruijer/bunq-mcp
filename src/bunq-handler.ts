import type { AuthRequest, OAuthHelpers } from "@cloudflare/workers-oauth-provider";
import { Hono } from "hono";
import { fetchUpstreamAuthToken, getUpstreamAuthorizeUrl, type Props } from "./utils";
import { env } from "cloudflare:workers";
import {
  clientIdAlreadyApproved,
  parseRedirectApproval,
  renderApprovalDialog,
} from "./workers-oauth-utils";
import { getPublicKey, signRequestBody } from "./utils/signature";

const app = new Hono<{ Bindings: Env & { OAUTH_PROVIDER: OAuthHelpers } }>();

app.get("/authorize", async (c) => {
  const oauthReqInfo = await c.env.OAUTH_PROVIDER.parseAuthRequest(c.req.raw);
  const { clientId } = oauthReqInfo;
  if (!clientId) {
    return c.text("Invalid request", 400);
  }

  if (await clientIdAlreadyApproved(c.req.raw, oauthReqInfo.clientId, env.COOKIE_ENCRYPTION_KEY)) {
    return redirectToBunq(c.req.raw, oauthReqInfo);
  }

  return renderApprovalDialog(c.req.raw, {
    client: await c.env.OAUTH_PROVIDER.lookupClient(clientId),
    server: {
      name: "Cloudflare Bunq MCP Server",
      logo: "https://bunq.com/assets/img/bunq-logo.svg",
      description: "This is a demo MCP Remote Server using Bunq for authentication.",
    },
    state: { oauthReqInfo },
  });
});

app.post("/authorize", async (c) => {
  const { state, headers } = await parseRedirectApproval(c.req.raw, env.COOKIE_ENCRYPTION_KEY);
  if (!state.oauthReqInfo) {
    return c.text("Invalid request", 400);
  }

  return redirectToBunq(c.req.raw, state.oauthReqInfo, headers);
});

async function redirectToBunq(
  request: Request,
  oauthReqInfo: AuthRequest,
  headers: Record<string, string> = {},
) {
  console.log("redirectToBunq", {
    redirect_uri: new URL("/callback", request.url).href,
  });
  return new Response(null, {
    status: 302,
    headers: {
      ...headers,
      location: getUpstreamAuthorizeUrl({
        upstream_url: "https://oauth.bunq.com/auth",
        scope: "read:user", // Bunq specific scopes can be added here
        client_id: env.BUNQ_CLIENT_ID,
        redirect_uri: new URL("/callback", request.url).href,
        state: btoa(JSON.stringify(oauthReqInfo)),
      }),
    },
  });
}

app.get("/callback", async (c) => {
  const oauthReqInfo = JSON.parse(atob(c.req.query("state") as string)) as AuthRequest;
  if (!oauthReqInfo.clientId) {
    return c.text("Invalid state", 400);
  }

  // Exchange the code for an access token
  const [accessToken, errResponse] = await fetchUpstreamAuthToken({
    upstream_url: "https://api.oauth.bunq.com/v1/token",
    client_id: env.BUNQ_CLIENT_ID,
    client_secret: env.BUNQ_CLIENT_SECRET,
    code: c.req.query("code"),
    redirect_uri: new URL("/callback", c.req.url).href,
    additionalParams: {
      grant_type: "authorization_code",
    },
  });

  if (errResponse) {
    return errResponse;
  }

  console.log("accessToken", accessToken);

  const pubKey = await getPublicKey();
  console.log("pubKey", pubKey);

  // Call Bunq installation endpoint
  const installationResponse = await fetch("https://api.bunq.com/v1/installation", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      // "X-Bunq-Client-Authentication": accessToken,
      "User-Agent": "bunq-mcp",
    },
    body: JSON.stringify({
      client_public_key: pubKey,
    }),
  });

  if (!installationResponse.ok) {
    console.log("installationResponse", await installationResponse.text());
    return c.text("Failed to complete Bunq installation", 500);
  }

  interface BunqInstallationResponse {
    Response: [
      {
        Id: {
          id: number;
        };
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

  const installationResponseText = await installationResponse.text();

  const installationData = JSON.parse(installationResponseText) as BunqInstallationResponse;

  const { token: installationToken } = installationData.Response[1].Token;

  console.log("got installationToken", installationToken);

  const deviceServerResponse = await fetch("https://api.bunq.com/v1/device-server", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Bunq-Client-Authentication": installationToken,
    },
    body: JSON.stringify({
      description: "Wilco AJ - Bunq MCP",
      secret: accessToken,
      permitted_ips: ["178.84.63.194", "*"],
    }),
  });

  if (!deviceServerResponse.ok) {
    console.log("deviceServerResponse", await deviceServerResponse.text());
    return c.text("Failed to fetch device server info", 500);
  }

  const deviceServerData = (await deviceServerResponse.json()) as {
    Response: [{ Id: { id: number } }];
  };
  console.log("got deviceServerData", deviceServerData.Response[0]);

  const sessionServerBody = JSON.stringify({
    secret: accessToken,
  });

  const signature = await signRequestBody(sessionServerBody);

  const sessionServerResponse = await fetch("https://api.bunq.com/v1/session-server", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Bunq-Client-Authentication": installationToken,
      "X-Bunq-Client-Signature": signature,
    },
    body: sessionServerBody,
  });

  if (!sessionServerResponse.ok) {
    console.log("sessionServerResponse", await sessionServerResponse.text());
    return c.text("Failed to fetch session server info", 500);
  }

  const sessionServerData = (await sessionServerResponse.json()) as any;

  const id = sessionServerData.Response[2].UserApiKey.granted_by_user.UserPerson.id;
  const displayName =
    sessionServerData.Response[2].UserApiKey.granted_by_user.UserPerson.display_name;

  // Return back to the MCP client a new token
  const { redirectTo } = await c.env.OAUTH_PROVIDER.completeAuthorization({
    request: oauthReqInfo,
    userId: id.toString(),
    metadata: {
      label: displayName,
    },
    scope: oauthReqInfo.scope,
    props: {
      bunqUserId: id,
      bunqDisplayName: displayName,
    } as Props,
  });

  return Response.redirect(redirectTo);
});

export { app as BunqHandler };
