# Bunq MCP

A Model Context Protocol server for Bunq.

![Screenshot](./resources/screenshot.png)

## Available Tools

This MCP server provides the following tools for interacting with Bunq:

1. **bunqAccounts** - Get your Bunq accounts with details like account type, balance, and ID
2. **getTransactions** - View transactions (payments) for a specific account
3. **getRequestInquiries** - Get money requests you've sent from a specific account
4. **createPaymentRequest** - Create a payment request to receive money into your account
5. **getPaymentAutoAllocates** - Get automatic payment allocation settings for an account
6. **getTopCounterparties** - Get a list of unique person counterparties based on recent transactions
7. **createPayment** - Create draft payments with optional scheduling (requires review / approval in
   the app before execution)

These tools can be accessed through any MCP client connected to this server.

## Installation & Usage

1. Install the `bunq-mcp` and `mcp-remote` CLI tools:

```sh
npm install -g bunq-mcp mcp-remote
```

2. In the Bunq app, create an OAuth client with the following settings:

- Redirect URL: `http://localhost:8788/callback`

(Modify the port if needed.)

3. (Optional) Generate a new public/private key pair:

```sh
bunq-mcp --generate-keys
```

Note this assumes `openssl` is installed & available on the PATH. If you decide to skip this step,
pre-existing keys in `./src/keys/` will be used. The created keys will override the pre-existing
keys and are stored in the global `node_modules` directory.

4. Start the MCP server in any terminal:

```sh
bunq-mcp --mcp --bunq-client-id <client-id> --bunq-client-secret <client-secret>
```

Client ID and secret can also be set using the `BUNQ_CLIENT_ID` and `BUNQ_CLIENT_SECRET`
environment variables.

5. In your favourite editor or other MCP client (such as Claude Desktop), add the following:

```json
{
  "mcpServers": {
    "bunq-mcp": {
      "command": "npx",
      "args": ["-y", "mcp-remote", "http://localhost:8788/sse"]
    }
  }
}
```

Again, modify the port if needed. `mcp-remote` is used because this package uses the SSE transport,
while most clients do not support that. See [mcp-remote](https://github.com/geelen/mcp-remote) for
more information.

6. As soon as the MCP server is started, `mcp-remote` should open your browser to start the OAuth
   flow.

You should now be able to ask a question, such as

- What's my current Bunq balance?
- What are my top 5 counterparties?
- What was my last transaction?

## Troubleshooting

- If there's any issue with the OAuth flow, you can try to delete the directory created by
  `mcp-remote` in your home directory: `rm -rf ~/.mcp-auth`.

## CLI

```
Usage: bunq-mcp [options]

Options:
  --help              Show help
  --version           Show version
  --generate-keys     Generate private and public key pair for Bunq installation
  --mcp               Start MCP server
  --host <host>       Host (for MCP server)
  --port <port>       Port (for MCP server)
  --bunq-client-id <id>       Bunq client ID (alternative to BUNQ_CLIENT_ID env var)
  --bunq-client-secret <secret> Bunq client secret (alternative to BUNQ_CLIENT_SECRET env var)
```

## Development

1. Create `.dev.vars` file in the root directory with the following content:

```sh
# When set to 1 the public/private key pair in this repo is used.
IS_DEVELOPMENT=1

# Create OAuth client in the Bunq app
BUNQ_CLIENT_ID=
BUNQ_CLIENT_SECRET=
```

2. Start development server

```sh
npm run dev
```

3. Setup MCP configuration

```json
{
  "mcpServers": {
    "bunq-mcp": {
      "command": "npx",
      "args": ["-y", "mcp-remote", "http://localhost:8788/sse"]
    }
  }
}
```

## Limitations

- It's not possible to create payments using the OAuth flow. Only draft payments can be created.

```json
{ "Error": [{ "error_description": "Not enough permissions to create payment." }] }
```
