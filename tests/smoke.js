const { app } = require("../backend/server");

async function run() {
  if (!app) {
    throw new Error("Server app was not created");
  }
  console.log("Smoke test passed: app initialized");
}

run().catch((err) => {
  console.error("Smoke test failed", err);
  process.exit(1);
});
