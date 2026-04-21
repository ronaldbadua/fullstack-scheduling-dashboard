const path = require("path");
const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");

const { createRepository } = require("./lib/repository");
const { createApiRouter } = require("./routes/api");

dotenv.config({ path: path.resolve(process.cwd(), ".env") });

const app = express();
app.use(cors());
app.use(express.json());

const repository = createRepository();
app.use("/api", createApiRouter(repository));

app.use(express.static(path.resolve(process.cwd(), "frontend")));

app.get("/healthz", (_req, res) => {
  res.json({ ok: true, storage: repository.mode });
});

app.use((_req, res) => {
  res.sendFile(path.resolve(process.cwd(), "frontend", "index.html"));
});

if (require.main === module) {
  const port = Number(process.env.PORT || 3000);
  app.listen(port, () => {
    console.log(`Scheduling dashboard listening on http://localhost:${port}`);
  });
}

module.exports = { app };
