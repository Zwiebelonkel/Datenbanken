// routes/admin.js
import express from "express";
import db from "../db.js";
import { requireAuth, requireAdmin } from "../auth.js";

const router = express.Router();

// NIE löschen:
const PROTECTED_USERS = ["admin", "gast", "guest", "guest_public"];

/* -----------------------
   Seiten-Flags (Admin)
------------------------ */
router.get("/pages", requireAuth, requireAdmin, async (_req, res) => {
  try {
    const result = await db.execute("SELECT key, enabled FROM page_settings");
    const pages = {};
    result.rows.forEach((r) => (pages[r.key] = !!r.enabled));
    res.json({ pages });
  } catch (err) {
    console.error("admin/pages GET", err);
    res.status(500).json({ error: "Fehler beim Laden der Seiten" });
  }
});

router.put("/pages/:key", requireAuth, requireAdmin, async (req, res) => {
  const key = req.params.key;
  const enabled = !!req.body.enabled;
  try {
    await db.execute({
      sql: `INSERT INTO page_settings (key, enabled)
            VALUES (?, ?)
            ON CONFLICT(key) DO UPDATE SET enabled=excluded.enabled`,
      args: [key, enabled ? 1 : 0],
    });
    const result = await db.execute("SELECT key, enabled FROM page_settings");
    const pages = {};
    result.rows.forEach((r) => (pages[r.key] = !!r.enabled));
    res.json({ pages });
  } catch (err) {
    console.error("admin/pages PUT", err);
    res.status(500).json({ error: "Fehler beim Speichern der Seite" });
  }
});

/* -----------------------
   TOOLS: Nutzer löschen (Preview + Exec)
------------------------ */
router.post(
  "/tools/users/delete-preview",
  requireAuth,
  requireAdmin,
  async (req, res) => {
    const { pattern = "user_%", inactiveDays = 0 } = req.body || {};
    try {
      let sql = `SELECT username FROM users WHERE username LIKE ?`;
      const args = [pattern];

      if (inactiveDays > 0) {
        sql += ` AND NOT EXISTS (
        SELECT 1 FROM scores s
        WHERE LOWER(s.username)=LOWER(users.username)
          AND s.created_at >= datetime('now', ?)
      )`;
        args.push(`-${inactiveDays} days`);
      }

      if (PROTECTED_USERS.length) {
        sql += ` AND LOWER(username) NOT IN (${PROTECTED_USERS.map(
          () => "?"
        ).join(",")})`;
        PROTECTED_USERS.forEach((u) => args.push(u.toLowerCase()));
      }

      const sample = await db.execute({
        sql: sql + " ORDER BY username COLLATE NOCASE LIMIT 100",
        args,
      });
      const cnt = await db.execute({
        sql: `SELECT COUNT(*) AS cnt FROM (${sql}) t`,
        args,
      });

      res.json({ count: Number(cnt.rows?.[0]?.cnt || 0), sample: sample.rows });
    } catch (err) {
      console.error("tools/users/delete-preview", err);
      res.status(500).json({ error: "Preview fehlgeschlagen" });
    }
  }
);

router.post(
  "/tools/users/delete-exec",
  requireAuth,
  requireAdmin,
  async (req, res) => {
    const { pattern = "user_%", inactiveDays = 0 } = req.body || {};
    try {
      let sql = `DELETE FROM users WHERE username LIKE ?`;
      const args = [pattern];

      if (inactiveDays > 0) {
        sql += ` AND NOT EXISTS (
        SELECT 1 FROM scores s
        WHERE LOWER(s.username)=LOWER(users.username)
          AND s.created_at >= datetime('now', ?)
      )`;
        args.push(`-${inactiveDays} days`);
      }

      if (PROTECTED_USERS.length) {
        sql += ` AND LOWER(username) NOT IN (${PROTECTED_USERS.map(
          () => "?"
        ).join(",")})`;
        PROTECTED_USERS.forEach((u) => args.push(u.toLowerCase()));
      }

      const del = await db.execute({ sql, args });
      const left = await db.execute({
        sql: `SELECT COUNT(*) AS cnt FROM users WHERE username LIKE ?`,
        args: [pattern],
      });

      res.json({
        deleted: del.rowsAffected ?? null,
        remainingWithPattern: Number(left.rows?.[0]?.cnt || 0),
      });
    } catch (err) {
      console.error("tools/users/delete-exec", err);
      res.status(500).json({ error: "Löschen fehlgeschlagen" });
    }
  }
);

/* -----------------------
   TOOLS: Scores eines Nutzers löschen
------------------------ */
router.delete(
  "/tools/scores/by-user/:username",
  requireAuth,
  requireAdmin,
  async (req, res) => {
    try {
      const u = req.params.username || "";
      const del = await db.execute({
        sql: `DELETE FROM scores WHERE LOWER(username)=LOWER(?)`,
        args: [u],
      });
      res.json({ deleted: del.rowsAffected ?? null });
    } catch (err) {
      console.error("tools/scores/by-user", err);
      res.status(500).json({ error: "Fehler beim Löschen" });
    }
  }
);

/* -----------------------
   TOOLS: Konto anpassen (money/xp/level)
------------------------ */
router.get(
  "/tools/export/users.csv",
  requireAuth,
  requireAdmin,
  async (_req, res) => {
    try {
      const rows = await db.execute(`
        SELECT id, username, level, xp, total_score, money, profile_image_url
        FROM users
        ORDER BY username COLLATE NOCASE ASC
      `);

      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader(
        "Content-Disposition",
        'attachment; filename="users.csv"'
      );

      // Headerzeile
      res.write("id,username,level,xp,total_score,money,profile_image_url\n");

      // Datensätze
      for (const r of rows.rows) {
        const line = [
          r.id,
          r.username,
          r.level,
          r.xp,
          r.total_score,
          r.money,
          r.profile_image_url ?? "",
        ]
          .map((v) => String(v).replace(/"/g, '""')) // Quotes escapen
          .join(",");
        res.write(line + "\n");
      }

      res.end();
    } catch (err) {
      console.error("export/users.csv", err);
      res.status(500).json({ error: "Export fehlgeschlagen" });
    }
  }
);

/* -----------------------
   TOOLS: CSV-Export
------------------------ */
router.post(
  "/tools/account/adjust",
  requireAuth,
  requireAdmin,
  async (req, res) => {
    const { username, moneyDelta, xpDelta, levelSet } = req.body || {};
    if (!username) return res.status(400).json({ error: "username required" });

    const changes = {};

    try {
      // moneyDelta nur anwenden, wenn vorhanden (leer/undefined ignorieren)
      if (moneyDelta !== undefined && moneyDelta !== "") {
        const m = Number(moneyDelta);
        if (!Number.isFinite(m))
          return res.status(400).json({ error: "moneyDelta invalid" });

        await db.execute({
          sql: `UPDATE users SET money = money + ? WHERE LOWER(username)=LOWER(?)`,
          args: [m, username],
        });
        changes.moneyDelta = m;
      }

      // xpDelta nur anwenden, wenn vorhanden
      if (xpDelta !== undefined && xpDelta !== "") {
        const x = Number(xpDelta);
        if (!Number.isFinite(x))
          return res.status(400).json({ error: "xpDelta invalid" });

        await db.execute({
          sql: `UPDATE users SET xp = xp + ? WHERE LOWER(username)=LOWER(?)`,
          args: [x, username],
        });
        changes.xpDelta = x;
      }

      // levelSet nur anwenden, wenn vorhanden
      if (levelSet !== undefined && levelSet !== "") {
        const lvl = Number(levelSet);
        if (!Number.isFinite(lvl))
          return res.status(400).json({ error: "levelSet invalid" });

        await db.execute({
          sql: `UPDATE users SET level = ? WHERE LOWER(username)=LOWER(?)`,
          args: [lvl, username],
        });
        changes.levelSet = lvl;
      }

      return res.json({ success: true, changes });
    } catch (err) {
      console.error("tools/account/adjust", err);
      return res.status(500).json({ error: "Update fehlgeschlagen" });
    }
  }
);

router.get(
  "/tools/export/scores.csv",
  requireAuth,
  requireAdmin,
  async (_req, res) => {
    try {
      const rows = await db.execute(`
      SELECT id, username, score, created_at, consecutive_wins, money_per_round
      FROM scores
      ORDER BY created_at DESC
    `);
      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader("Content-Disposition", 'attachment; filename="scores.csv"');
      res.write(
        "id,username,score,created_at,consecutive_wins,money_per_round\n"
      );
      for (const r of rows.rows) {
        const line = [
          r.id,
          r.username,
          r.score,
          r.created_at,
          r.consecutive_wins ?? "",
          r.money_per_round ?? "",
        ]
          .map((v) => String(v).replace(/"/g, '""'))
          .join(",");
        res.write(line + "\n");
      }
      res.end();
    } catch (err) {
      console.error("export/scores.csv", err);
      res.status(500).json({ error: "Export fehlgeschlagen" });
    }
  }
);

export default router;
