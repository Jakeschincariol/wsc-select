const { issue, clear, passwordMatches } = require("./_auth");

/* Deliberately slow and vague: one shared password is inherently guessable, so
   fail slowly and never say whether the password was close. */
module.exports = async (req, res) => {
  if (req.method === "DELETE") {
    res.setHeader("Set-Cookie", clear());
    return res.status(200).json({ ok: true });
  }
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST, DELETE");
    return res.status(405).json({ ok: false });
  }
  if (!process.env.ADMIN_PASSWORD) {
    return res.status(503).json({ ok: false, error: "Portal is not configured." });
  }
  const given = (req.body && req.body.password) || "";
  await new Promise((r) => setTimeout(r, 400));
  if (!passwordMatches(given)) {
    return res.status(401).json({ ok: false, error: "Incorrect password." });
  }
  res.setHeader("Set-Cookie", issue());
  return res.status(200).json({ ok: true });
};
