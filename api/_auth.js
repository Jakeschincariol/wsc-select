/* Shared gate for the nominations portal.
 *
 * One password, held only as an env var. The browser never sees it: on success
 * we hand back a signed, httpOnly cookie, so the password is not sitting in
 * localStorage or in any client bundle where a shared laptop could leak it.
 *
 * This table holds children's names and guardians' contact details, so the
 * comparison is timing-safe and the cookie is Secure + SameSite=Strict.
 */
const crypto = require("crypto");

const COOKIE = "wsc_admin";
const TTL = 60 * 60 * 12; // 12 hours

function secret() {
  return process.env.SESSION_SECRET || process.env.ADMIN_PASSWORD || "";
}

function sign(exp) {
  return crypto.createHmac("sha256", secret()).update(String(exp)).digest("hex");
}

function issue() {
  const exp = Math.floor(Date.now() / 1000) + TTL;
  return `${COOKIE}=${exp}.${sign(exp)}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=${TTL}`;
}

function clear() {
  return `${COOKIE}=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0`;
}

function authed(req) {
  const raw = req.headers.cookie || "";
  const hit = raw.split(/;\s*/).find((c) => c.startsWith(COOKIE + "="));
  if (!hit) return false;
  const [exp, mac] = hit.slice(COOKIE.length + 1).split(".");
  if (!exp || !mac) return false;
  if (Number(exp) < Math.floor(Date.now() / 1000)) return false;
  const want = Buffer.from(sign(exp));
  const got = Buffer.from(mac);
  return want.length === got.length && crypto.timingSafeEqual(want, got);
}

function passwordMatches(input) {
  const pass = process.env.ADMIN_PASSWORD || "";
  if (!pass || typeof input !== "string") return false;
  const a = crypto.createHash("sha256").update(input).digest();
  const b = crypto.createHash("sha256").update(pass).digest();
  return crypto.timingSafeEqual(a, b);
}

module.exports = { issue, clear, authed, passwordMatches };
