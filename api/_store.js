/* Storage for nominations: one private JSON blob per record.
 *
 * Vercel Blob rather than a SQL database, for three reasons: the store is
 * dedicated to this club so a child's name never sits in another project's
 * database, it needs no schema migration to stand up, and a nomination is a
 * self-contained document with no relations worth joining.
 *
 * Every blob is access:'private' — they are not reachable by URL.
 */
const PREFIX = "nominations/";

async function blob() {
  return await import("@vercel/blob");
}

function id() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

async function save(record) {
  const { put } = await blob();
  const key = record.id || id();
  const row = { ...record, id: key };
  await put(`${PREFIX}${key}.json`, JSON.stringify(row, null, 2), {
    access: "private",
    contentType: "application/json",
    addRandomSuffix: false,
    allowOverwrite: true,
    cacheControlMaxAge: 0,
  });
  return row;
}

async function all() {
  const { list, get } = await blob();
  const { blobs } = await list({ prefix: PREFIX, limit: 1000 });
  const out = await Promise.all(
    blobs.map(async (b) => {
      try {
        const r = await get(b.pathname, { access: "private", useCache: false });
        const text = typeof r === "string" ? r : await (r.text ? r.text() : r.blob().then((x) => x.text()));
        return JSON.parse(text);
      } catch (err) {
        console.error("unreadable blob", b.pathname, err);
        return null;
      }
    })
  );
  return out.filter(Boolean).sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)));
}

async function setStatus(key, status) {
  const rows = await all();
  const row = rows.find((r) => String(r.id) === String(key));
  if (!row) return false;
  await save({ ...row, status });
  return true;
}

module.exports = { save, all, setStatus, id };
