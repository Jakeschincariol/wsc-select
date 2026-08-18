const { authed } = require("./_auth");
const store = require("./_store");

/* GET   -> every nomination, newest first
   PATCH -> { id, status } to move one through the pipeline */
module.exports = async (req, res) => {
  if (!authed(req)) return res.status(401).json({ ok: false, error: "Not signed in." });
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return res.status(503).json({ ok: false, error: "Storage is not configured." });
  }

  try {
    if (req.method === "GET") {
      return res.status(200).json({ ok: true, rows: await store.all() });
    }

    if (req.method === "PATCH") {
      const { id, status } = req.body || {};
      const allowed = ["new", "reviewing", "invited", "declined"];
      if (!id || !allowed.includes(status)) {
        return res.status(400).json({ ok: false, error: "Bad id or status." });
      }
      const done = await store.setStatus(id, status);
      if (!done) return res.status(404).json({ ok: false, error: "No such nomination." });
      return res.status(200).json({ ok: true });
    }

    res.setHeader("Allow", "GET, PATCH");
    return res.status(405).json({ ok: false });
  } catch (err) {
    console.error("nominations route threw", err);
    return res.status(502).json({ ok: false, error: "Storage unreachable." });
  }
};
