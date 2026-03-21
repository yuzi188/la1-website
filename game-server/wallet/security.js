const crypto = require("crypto");

function sign(payload) {
  const secret = process.env.SECRET;
  if (!secret) throw new Error("SECRET env variable not set");
  return crypto
    .createHmac("sha256", secret)
    .update(JSON.stringify(payload))
    .digest("hex");
}

function verify(payload, signature) {
  const expected = sign(payload);
  return crypto.timingSafeEqual(
    Buffer.from(expected, "hex"),
    Buffer.from(signature, "hex")
  );
}

module.exports = { sign, verify };
