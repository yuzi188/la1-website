/**
 * Wallet Adapter — bridges game server to LA1 platform wallet API
 */

const fetch = require("node-fetch");
const { sign } = require("./security");

async function callAPI(path, data) {
  const walletUrl = process.env.WALLET_URL;
  if (!walletUrl) {
    console.warn("[Wallet] WALLET_URL not set — skipping API call:", path);
    return { success: true, simulated: true };
  }

  const signature = sign(data);
  const res = await fetch(walletUrl + path, {
    method:  "POST",
    headers: {
      "Content-Type": "application/json",
      "X-SIGN":        signature,
    },
    body: JSON.stringify(data),
    timeout: 8000,
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Wallet API error ${res.status}: ${body}`);
  }
  return res.json();
}

module.exports = {
  bet:      (userId, amount, roundId) => callAPI("/bet",      { userId, amount, roundId }),
  win:      (userId, amount, roundId) => callAPI("/win",      { userId, amount, roundId }),
  refund:   (userId, amount, roundId) => callAPI("/refund",   { userId, amount, roundId }),
  balance:  (userId)                  => callAPI("/balance",  { userId }),
};
