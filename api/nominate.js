/* POST /api/nominate
 *
 * Two jobs, in this order:
 *   1. write the nomination to a private Vercel Blob store (the record of truth)
 *   2. email Brian via Resend            (the notification)
 *
 * The order matters. If the email provider is down, the nomination is still
 * captured and recoverable; the reverse would lose it. A failure in step 2 is
 * reported but does NOT fail the request, because the row already exists.
 *
 * Required env vars (set in Vercel, never in the client):
 *   RESEND_API_KEY, MAIL_FROM        e.g. "WSC Select <nominations@yourdomain.com>"
 *   MAIL_TO                          defaults to brian.mazza@gmail.com
 */

const crypto = require("crypto");
const store = require("./_store");

/* A public endpoint that both writes storage and sends mail is worth throttling:
   without it one script can flood the store and Brian's inbox. The caller's IP is
   hashed, never stored raw, and the window is short enough that a coach filing
   three nominations in a sitting is unaffected. */
const WINDOW_MS = 15 * 60 * 1000;
const MAX_PER_WINDOW = 4;

function callerHash(req) {
  const ip = (req.headers["x-forwarded-for"] || "").split(",")[0].trim() || "unknown";
  return crypto.createHash("sha256").update(ip).digest("hex").slice(0, 16);
}

const FIELDS = ["player", "age", "club", "you", "email", "why"];
const LIMITS = { player: 120, age: 40, club: 120, you: 120, email: 200, why: 2000 };
const REQUIRED = ["player", "age", "club", "you", "email"];

function clean(body) {
  const out = {};
  for (const f of FIELDS) {
    const v = typeof body[f] === "string" ? body[f].trim() : "";
    out[f] = v.slice(0, LIMITS[f]);
  }
  return out;
}

function invalid(d) {
  for (const f of REQUIRED) if (!d[f]) return `Missing ${f}`;
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(d.email)) return "That email address does not look right";
  return null;
}

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  const body = typeof req.body === "object" && req.body ? req.body : {};

  /* honeypot: real people never fill a hidden field */
  if (typeof body.company === "string" && body.company.trim() !== "") {
    return res.status(200).json({ ok: true });
  }

  const d = clean(body);
  const bad = invalid(d);
  if (bad) return res.status(400).json({ ok: false, error: bad });

  const { RESEND_API_KEY, MAIL_FROM } = process.env;
  const MAIL_TO = process.env.MAIL_TO || "brian.mazza@gmail.com";

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return res.status(503).json({ ok: false, error: "Nominations are not configured yet." });
  }

  const who = callerHash(req);
  try {
    const recent = await store.all();
    const since = Date.now() - WINDOW_MS;
    const mine = recent.filter(
      (r) => r.caller === who && new Date(r.created_at).getTime() > since
    );
    if (mine.length >= MAX_PER_WINDOW) {
      return res.status(429).json({ ok: false, error: "Too many nominations just now. Try again shortly." });
    }
  } catch (err) {
    console.error("throttle check failed, allowing", err && err.message);
  }

  /* 1. record it. This happens FIRST: if the mail provider is down the
     nomination is still captured, whereas the reverse would lose it. */
  try {
    await store.save({
      created_at: new Date().toISOString(),
      player_name: d.player,
      age_group: d.age,
      current_club: d.club,
      nominated_by: d.you,
      contact_email: d.email,
      notes: d.why || null,
      user_agent: (req.headers["user-agent"] || "").slice(0, 300),
      caller: who,
      status: "new",
    });
  } catch (err) {
    console.error("blob save failed", err);
    return res.status(502).json({ ok: false, error: "Could not save the nomination." });
  }

  /* 2. notify. The row is already safe, so a failure here is logged, not fatal. */
  let emailed = false;
  if (RESEND_API_KEY && MAIL_FROM) {
    try {
      const text = [
        `Player name:   ${d.player}`,
        `Age group:     ${d.age}`,
        `Current club:  ${d.club}`,
        ``,
        `Nominated by:  ${d.you}`,
        `Contact email: ${d.email}`,
        ``,
        `Why this player:`,
        d.why || "(not given)",
        ``,
        `— wscselect nomination form`,
      ].join("\n");

      const r = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: MAIL_FROM,
          to: [MAIL_TO],
          reply_to: d.email,          /* Brian can just hit reply */
          subject: `WSC Select nomination — ${d.player}`,
          text,
        }),
      });
      emailed = r.ok;
      if (!r.ok) console.error("resend failed", r.status, await r.text());
    } catch (err) {
      console.error("resend threw", err);
    }
  }

  return res.status(200).json({ ok: true, emailed });
};
