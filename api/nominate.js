/* POST /api/nominate
 *
 * Two jobs, in this order:
 *   1. write the nomination to Supabase  (the record of truth)
 *   2. email Brian via Resend            (the notification)
 *
 * The order matters. If the email provider is down, the nomination is still
 * captured and recoverable; the reverse would lose it. A failure in step 2 is
 * reported but does NOT fail the request, because the row already exists.
 *
 * Required env vars (set in Vercel, never in the client):
 *   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 *   RESEND_API_KEY, MAIL_FROM        e.g. "WSC Select <nominations@yourdomain.com>"
 *   MAIL_TO                          defaults to brian.mazza@gmail.com
 */

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

  const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, RESEND_API_KEY, MAIL_FROM } = process.env;
  const MAIL_TO = process.env.MAIL_TO || "brian.mazza@gmail.com";

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return res.status(503).json({ ok: false, error: "Nominations are not configured yet." });
  }

  const row = {
    player_name: d.player,
    age_group: d.age,
    current_club: d.club,
    nominated_by: d.you,
    contact_email: d.email,
    notes: d.why || null,
    user_agent: (req.headers["user-agent"] || "").slice(0, 300),
  };

  /* 1. record it */
  try {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/nominations`, {
      method: "POST",
      headers: {
        apikey: SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
      body: JSON.stringify(row),
    });
    if (!r.ok) {
      const detail = await r.text();
      console.error("supabase insert failed", r.status, detail);
      return res.status(502).json({ ok: false, error: "Could not save the nomination." });
    }
  } catch (err) {
    console.error("supabase insert threw", err);
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
