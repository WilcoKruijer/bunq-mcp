import type { AuthRequest, OAuthHelpers } from "@cloudflare/workers-oauth-provider";
import { Hono } from "hono";
import { env } from "cloudflare:workers";
import {
  clientIdAlreadyApproved,
  parseRedirectApproval,
  renderApprovalDialog,
} from "../workers-oauth-utils";
import { getBunqClient } from "./BunqClient";
import type { BunqAuthProps } from "./types";

export const createOAuthHandler = () => {
  const app = new Hono<{ Bindings: Env & { OAUTH_PROVIDER: OAuthHelpers } }>();

  app.get("/authorize", async (c) => {
    const oauthReqInfo = await c.env.OAUTH_PROVIDER.parseAuthRequest(c.req.raw);
    const { clientId } = oauthReqInfo;
    if (!clientId) {
      return c.text("Invalid request", 400);
    }

    if (
      await clientIdAlreadyApproved(c.req.raw, oauthReqInfo.clientId, env.COOKIE_ENCRYPTION_KEY)
    ) {
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

  app.get("/callback", async (c) => {
    const state = c.req.query("state");
    if (!state) {
      return c.text("Missing state query parameter", 400);
    }

    const oauthReqInfo = JSON.parse(atob(state)) as AuthRequest;
    if (!oauthReqInfo.clientId) {
      return c.text("Invalid state", 400);
    }

    // Exchange the code for an access token
    const code = c.req.query("code");
    if (!code) {
      return c.text("Missing authorization code", 400);
    }

    // Get access token from Bunq
    const tokenUrl = new URL("https://api.oauth.bunq.com/v1/token");
    tokenUrl.searchParams.set("grant_type", "authorization_code");
    tokenUrl.searchParams.set("code", code);
    tokenUrl.searchParams.set("client_id", env.BUNQ_CLIENT_ID);
    tokenUrl.searchParams.set("client_secret", env.BUNQ_CLIENT_SECRET);
    tokenUrl.searchParams.set("redirect_uri", new URL("/callback", c.req.url).href);

    const tokenResponse = await fetch(tokenUrl.toString(), {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
    });

    if (!tokenResponse.ok) {
      console.error("Failed to exchange code for token", await tokenResponse.text());
      return c.text("Failed to authenticate with Bunq", 500);
    }

    const tokenData = (await tokenResponse.json()) as { access_token: string };
    const accessToken = tokenData.access_token;

    try {
      // Initialize the Bunq client with the access token
      const bunqClient = getBunqClient(accessToken);
      const tokenData = await bunqClient.initialize();

      // Return back to the MCP client a new token
      const { redirectTo } = await c.env.OAUTH_PROVIDER.completeAuthorization({
        request: oauthReqInfo,
        userId: tokenData.userId.toString(),
        metadata: {
          label: tokenData.displayName,
        },
        scope: oauthReqInfo.scope,
        props: {
          bunqUserId: tokenData.userId,
          bunqDisplayName: tokenData.displayName,
          accessToken,
        } as BunqAuthProps,
      });

      return Response.redirect(redirectTo);
    } catch (error) {
      console.error("Error during Bunq initialization", error);
      return c.text("Failed to initialize Bunq client", 500);
    }
  });

  return app;
};

function getUpstreamAuthorizeUrl(params: {
  upstream_url: string;
  scope: string;
  client_id: string;
  redirect_uri: string;
  state: string;
}) {
  const url = new URL(params.upstream_url);
  url.searchParams.set("client_id", params.client_id);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", params.scope);
  url.searchParams.set("redirect_uri", params.redirect_uri);
  url.searchParams.set("state", params.state);
  return url.toString();
}

function redirectToBunq(
  request: Request,
  oauthReqInfo: AuthRequest,
  headers: Record<string, string> = {},
) {
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
