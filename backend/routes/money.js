import express from "express";
import db from "../db.js";
import { requireAuth, requireAdmin } from "../auth.js";

const router = express.Router();

// POST /api/money/update (SECURED)
// Allows a user to add or remove a specific amount from their own balance.
// The amount is a raw value; multipliers are NOT applied here.
router.post("/update", requireAuth, async (req, res) => {
  const { amount } = req.body;
  const userId = req.user.id; // USE ID FROM TOKEN

  const amountToAdd = Number(amount);
  if (!Number.isFinite(amountToAdd)) {
    return res.status(400).json({ error: "Invalid amount specified." });
  }

  try {
    // Update the money for the authenticated user.
    await db.execute({
      sql: `UPDATE users SET money = money + ? WHERE id = ?`,
      args: [amountToAdd, userId],
    });

    // Fetch the new balance to return to the client.
    const result = await db.execute({
      sql: `SELECT money FROM users WHERE id = ?`,
      args: [userId],
    });
    const newMoney = result.rows[0]?.money ?? 0;

    res.json({ 
      success: true, 
      credited: amountToAdd, 
      newBalance: newMoney 
    });

  } catch (err) {
    console.error("❌ /money/update error:", err);
    res.status(500).json({ error: "Server error while updating money." });
  }
});

// POST /api/money/setMultiplier (SECURED - ADMIN ONLY)
// Allows an administrator to set the score and money multipliers for a specific user.
router.post("/setMultiplier", requireAuth, requireAdmin, async (req, res) => {
    const { username, score_multiplier, monetary_multiplier } = req.body;

    if (!username) {
        return res.status(400).json({ error: "Username is required." });
    }

    // Validate multipliers
    const sm = Number(score_multiplier) || 1.0;
    const mm = Number(monetary_multiplier) || 1.0;

    if (!Number.isFinite(sm) || !Number.isFinite(mm) || sm < 0 || mm < 0) {
        return res.status(400).json({ error: "Invalid multiplier values." });
    }

    try {
        const result = await db.execute({
            sql: "UPDATE users SET score_multiplier = ?, monetary_multiplier = ? WHERE username = ?",
            args: [sm, mm, username]
        });

        if (result.rowsAffected === 0) {
            return res.status(404).json({ error: `User '${username}' not found.` });
        }

        res.json({ 
            success: true, 
            message: `Multipliers for ${username} updated successfully.` 
        });

    } catch(err) {
        console.error("❌ /money/setMultiplier error:", err);
        res.status(500).json({ error: "Server error while setting multipliers." });
    }
});


export default router;
