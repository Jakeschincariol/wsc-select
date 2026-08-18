const { authed } = require("./_auth");

/* GET   -> every nomination, newest first
   PATCH -> { id, status } to move one through the pipeline */
module.exports = async (req, res) => {
  if (!authed(req)) return res.status(401).json({ ok: false, error: "Not signed in." });

  const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env;
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return res.status(503).json({ ok: false, error: "Storage is not configured." });
  }
  const h = {
    apikey: SUPABASE_SERVICE_ROLE_KEY,
    Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
    "Content-Type": "application/json",
  };

  try {
    if (req.method === "GET") {
      const r = await fetch(
        `${SUPABASE_URL}/rest/v1/nominations?select=*&order=created_at.desc&limit=500`,
        { headers: h }
      );
      if (!r.ok) return res.status(502).json({ ok: false, error: "Could not read nominations." });
      return res.status(200).json({ ok: true, rows: await r.json() });
    }

    if (req.method === "PATCH") {
      const { id, status } = req.body || {};
      const allowed = ["new", "reviewing", "invited", "declined"];
      if (!id || !allowed.includes(status)) {
        return res.status(400).json({ ok: false, error: "Bad id or status." });
      }
      const r = await fetch(`${SUPABASE_URL}/rest/v1/nominations?id=eq.${encodeURIComponent(id)}`, {
        method: "PATCH",
        headers: { ...h, Prefer: "return=minimal" },
        body: JSON.stringify({ status }),
      });
      if (!r.ok) return res.status(502).json({ ok: false, error: "Could not update." });
      return res.status(200).json({ ok: true });
    }

    res.setHeader("Allow", "GET, PATCH");
    return res.status(405).json({ ok: false });
  } catch (err) {
    console.error("nominations route threw", err);
    return res.status(502).json({ ok: false, error: "Storage unreachable." });
  }
};
