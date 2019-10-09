const { readFileSync } = require("fs");
const fs = require("fs").promises;
const path = require("path");
const mkdir = require("mkdirp");
const { Lock } = require("./lock");

const { DATA_DIR } = require("./config");

mkdir.sync(DATA_DIR);

const TXFILE = path.resolve(DATA_DIR, "amsdb_txstate");

let nextAvailableTransactionId = 0;

const txlock = new Lock();

// Pre-load the txid from disk at startup
(() => {
  try {
    const raw = readFileSync(TXFILE, "utf-8");
    const txidState = JSON.parse(raw);
    nextAvailableTransactionId = txidState.txid;
  } catch (err) {
    if (err.code === "ENOENT") {
      // Starting for the first time!
      nextAvailableTransactionId = 0;
    } else {
      throw err;
    }
  }
})();

async function getReadTransactionId() {
  return nextAvailableTransactionId;
}

async function writeFileAndSync(file, content) {
  const fh = await fs.open(file, "w");
  await fh.writeFile(JSON.stringify(content));
  await fh.sync();
  await fh.close();
}

async function getWriteTransactionId() {
  const release = await txlock.acquire();

  // We write the txid to disk before we give it to the consumer.
  //
  // If the system crashes before we write it, it is fine and we'll
  // reuse later.
  //
  // If the system crashes before any row is written, then the txid is
  // skiped.
  const currentTransactionId = nextAvailableTransactionId;

  nextAvailableTransactionId++;
  await writeFileAndSync(TXFILE, {
    txid: nextAvailableTransactionId
  });

  release();

  return currentTransactionId;
}

module.exports = { getReadTransactionId, getWriteTransactionId };
