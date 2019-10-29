const path = require("path");
const mkdir = require("mkdirp");
const fs = require("fs").promises;
const { Lock } = require("./lock");
const { isCommited } = require("./transactions");

const { DATA_DIR } = require("./config");

const keyLocks = {};

async function filterAsync(fn, arr) {
  const res = [];
  for (let i = 0; i < arr.length; i++) {
    if (await fn(arr[i])) {
      res.push(arr[i]);
    }
  }
  return res;
}

async function acquireKeyLock(key) {
  if (!(key in keyLocks)) {
    keyLocks[key] = new Lock({
      onClear: () => {
        delete keyLocks[key];
      }
    });
  }
  return keyLocks[key].acquire();
}

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

    const visibleVersions = entries.filter(entry => {
      return (
        (entry.txid <= tx.txid &&
          !tx.openTransactionIds.includes(entry.txid) &&
          isCommited(entry.txid)) ||
        entry.txid === tx.txid
      );
    });

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

async function hasKey(tx, key) {
  return (await readKey(tx, key)) !== null;
}

async function listKeys(tx, prefix = "") {
  const files = await fs.readdir(path.resolve(DATA_DIR, "keys"));
  const filteredKeys = files.filter(key => key.startsWith(prefix));
  const visibleKeys = await filterAsync(key => hasKey(tx, key), filteredKeys);
  return visibleKeys;
}

async function writeKey(tx, key, value) {
  const out = getFilePathForKey(key);

  const raw = JSON.stringify({
    txid: tx.txid,
    value
  });

  const release = await acquireKeyLock(key);
  const fh = await fs.open(out, "a");
  await fh.writeFile(raw + "\n");
  await fh.sync();
  await fh.close();
  release();
}

module.exports = { readKey, writeKey, listKeys };
