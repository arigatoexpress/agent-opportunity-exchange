import { writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";

const args = new Set(process.argv.slice(2));
const envPath = resolve(process.env.AOE_X402_ENV_PATH ?? ".env.x402.local");
const writeEnv = args.has("--write-env");
const force = args.has("--force");
const showPrivateKey = args.has("--show-private-key");

const sellerPrivateKey = generatePrivateKey();
const buyerPrivateKey = generatePrivateKey();
const seller = privateKeyToAccount(sellerPrivateKey);
const buyer = privateKeyToAccount(buyerPrivateKey);

if (writeEnv) {
  if (existsSync(envPath) && !force) {
    throw new Error(`${envPath} already exists. Re-run with --force to replace it.`);
  }
  await writeFile(
    envPath,
    [
      "# Generated burner wallet pair for Base Sepolia x402 testing.",
      "# Never fund these addresses with mainnet assets.",
      "AOE_PAYMENT_MODE=x402_testnet",
      "AOE_X402_NETWORK=eip155:84532",
      "AOE_X402_FACILITATOR_URL=https://x402.org/facilitator",
      `AOE_X402_PAY_TO=${seller.address}`,
      `AOE_BUYER_EVM_PRIVATE_KEY=${buyerPrivateKey}`,
      `EVM_PRIVATE_KEY=${buyerPrivateKey}`,
      "AOE_X402_CLIENT_MAX_USD=1.00",
      "",
    ].join("\n"),
    { mode: 0o600 },
  );
}

const hidden = "[hidden; use --show-private-key only in a private local terminal]";
console.log(
  JSON.stringify(
    {
      schemaVersion: "aoe.x402.burner_wallet_pair.v1",
      network: "eip155:84532",
      networkLabel: "Base Sepolia",
      facilitatorUrl: "https://x402.org/facilitator",
      seller: {
        role: "server payTo receiver",
        address: seller.address,
        privateKey: showPrivateKey ? sellerPrivateKey : hidden,
      },
      buyer: {
        role: "client payer",
        address: buyer.address,
        privateKey: showPrivateKey ? buyerPrivateKey : hidden,
      },
      envFile: writeEnv
        ? {
            written: true,
            path: envPath,
            containsPrivateKeys: true,
            gitIgnoredByDefault: true,
          }
        : {
            written: false,
            hint: "Re-run with --write-env to create .env.x402.local without printing private keys.",
          },
      safety: {
        mainnet: "blocked",
        liveSettlementAllowed: false,
        serverPrivateKeyRequired: false,
      },
    },
    null,
    2,
  ),
);
