const path = require("path");
const mkdir = require("mkdirp");
const fs = require("fs").promises;
const { acquireLock } = require("./lock");

const { DATA_DIR } = require("./config");

mkdir.sync(DATA_DIR);
mkdir.sync(path.resolve(DATA_DIR, "keys"));

function getFilePathForKey(key) {
  return path.resolve(DATA_DIR, "keys", key);
}

async function readKey(tx, key) {
  try {
    const raw = await fs.readFile(getFilePathForKey(key), "utf-8");

    const entries = raw
      .split("\n")
      .slice(0, -1)
      .map(line => JSON.parse(line));

    const visibleVersions = entries.filter(
      entry =>
        entry.txid <= tx.txid && !tx.openTransactionIds.includes(entry.txid)
    );

    return visibleVersions.length === 0
      ? null
      : visibleVersions[visibleVersions.length - 1];
  } catch (err) {
    if (err.code === "ENOENT") {
      return null;
    } else {
      throw err;
    }
  }
}

async function writeKey(tx, key, value) {
  const out = getFilePathForKey(key);

  const raw = JSON.stringify({
    txid: tx.txid,
    value
  });

  const release = await acquireLock(key);
  const fh = await fs.open(out, "a");
  await fh.writeFile(raw + "\n");
  await fh.sync();
  await fh.close();
  release();
}

module.exports = { readKey, writeKey };
