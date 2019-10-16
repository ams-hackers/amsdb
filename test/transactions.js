const test = require("ava");
const axios = require("axios");

const request = axios.create({
  baseURL: "http://localhost:3000",
  headers: { "Content-Type": "application/json" }
});

// You need to close this at some point.
const startTransaction = async () => {
  const { data: tx } = await request.post("/begin-write-transaction");
  return tx;
};

const writeKey = async (tx, key, value) =>
  request.put(`/keys/${key}?token=${tx}`, { value });

const closeTransaction = async tx =>
  request.post(`/close-write-transaction?token=${tx}`);

const readKey = async (tx, key) => {
  let query = tx ? `?token=${tx}` : "";

  const response = await request.get(`/keys/${key}${query}`);
  return response.data.value.value;
};

test.serial("don't read open writes", async t => {
  const davidTx = await startTransaction();
  await writeKey(davidTx, "name", "david");
  await closeTransaction(davidTx);

  const txAlex = await startTransaction();
  await writeKey("name", "alex");

  const visibleName = await readKey(null, "name");
  await closeTransaction(txAlex);

  t.is(visibleName, "david");
});

test.serial("should be able to read own writes", async t => {
  const alexTx = await startTransaction();
  await writeKey(alexTx, "name", "alex");

  const name = await readKey(alexTx, "name");
  await closeTransaction();
  t.is(name, "alex");
});
