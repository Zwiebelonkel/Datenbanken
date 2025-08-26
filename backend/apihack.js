const payload = {
  username: "MaxMustermann", // <-- Deinen Benutzernamen hier einsetzen
  baseScore: 120,
  baseMoneyPerRound: 40,
  consecutive_wins: 3,
};

const endpoint = "https://outside-between.onrender.com/api/scores/submit";

fetch(endpoint, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
  },
  body: JSON.stringify(payload),
})
  .then(async (response) => {
    const text = await response.text();

    if (!response.ok) {
      console.error("❌ Fehlerstatus:", response.status);
      console.error("❌ Serverantwort:", text);
      return;
    }

    try {
      const data = JSON.parse(text);
      console.log("✅ Score erfolgreich eingetragen:", data);
    } catch (err) {
      console.error("❌ Antwort war kein gültiges JSON:", err);
      console.error("Rohantwort:", text);
    }
  })
  .catch((err) => {
    console.error("❌ Netzwerkfehler:", err);
  });
