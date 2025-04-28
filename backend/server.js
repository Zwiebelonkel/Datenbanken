const express = require('express');
const cors = require('cors');
const app = express();
const scoresRoutes = require('./routes/scores');

app.use(cors());
app.use(express.json());
app.use('/api/scores', scoresRoutes);

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server läuft auf http://localhost:${PORT}`);
  console.log(`Ein Glück`);

});
