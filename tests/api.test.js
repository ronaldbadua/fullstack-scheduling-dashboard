const test = require("node:test");
const assert = require("node:assert/strict");
const request = require("supertest");
const { app } = require("../backend/server");

test("GET /api/health returns ok", async () => {
  const res = await request(app).get("/api/health");
  assert.equal(res.status, 200);
  assert.equal(res.body.ok, true);
});

test("GET /api/state returns associates array", async () => {
  const res = await request(app).get("/api/state");
  assert.equal(res.status, 200);
  assert.equal(Array.isArray(res.body.associates), true);
});

test("POST /api/schedule/auto-assign generates month schedule", async () => {
  const month = new Date().toISOString().slice(0, 7);
  const res = await request(app)
    .post("/api/schedule/auto-assign")
    .send({ month, overwrite: true });

  assert.equal(res.status, 200);
  const countForMonth = Object.keys(res.body.assignments).filter((iso) => iso.startsWith(month)).length;
  assert.ok(countForMonth >= 28);
});
