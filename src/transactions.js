const { readFileSync } = require("fs");
const fs = require("fs").promises;
const path = require("path");
const mkdir = require("mkdirp");
const { Lock } = require("./lock");

const { DATA_DIR } = require("./config");

mkdir.sync(DATA_DIR);

const TXFILE = path.resolve(DATA_DIR, "amsdb_txstate");

let currentTransactionId = 0;

const txlock = new Lock();

let mightLastTransactionBeWrite = true;

let openTransactionIds = [];

let commitedTransactionIds = [];

let release = null;

// Pre-load the txid from disk at startup
(() => {
  try {
    const raw = readFileSync(TXFILE, "utf-8");
    const txidState = JSON.parse(raw);
    currentTransactionId = txidState.txid;
  } catch (err) {
    if (err.code === "ENOENT") {
      // Starting for the first time!
      currentTransactionId = 0;
    } else {
      throw err;
    }
  }
})();

class Transaction {
  constructor(txid, openTransactionIds) {
    this.txid = txid;
    this.openTransactionIds = openTransactionIds;
  }
}

async function getReadTransaction() {
  if (mightLastTransactionBeWrite) {
    ++currentTransactionId;
    mightLastTransactionBeWrite = false;
  }
  return new Transaction(currentTransactionId, openTransactionIds);
}

async function writeFileAndSync(file, content) {
  const fh = await fs.open(file, "w");
  await fh.writeFile(JSON.stringify(content));
  await fh.sync();
  await fh.close();
}

async function getWriteTransaction() {
  release = await txlock.acquire();
  // We write the txid to disk before we give it to the consumer.
  //
  // If the system crashes before we write it, it is fine and we'll
  // reuse later.
  //
  // If the system crashes before any row is written, then the txid is
  // skiped.
  ++currentTransactionId;
  mightLastTransactionBeWrite = true;

  const newTransaction = new Transaction(
    currentTransactionId,
    openTransactionIds
  );

  // Make sure the current transaction is visible by recording it as open after we create our own transaction.
  openTransactionIds = [...openTransactionIds, currentTransactionId];

  await writeFileAndSync(TXFILE, {
    txid: currentTransactionId
  });

  return newTransaction;
}

function releaseWriteTransaction(tx) {
  if (release === null) {
    throw Error("Can't release lock before locking.");
  }

  openTransactionIds = openTransactionIds.filter(
    openTxId => openTxId !== tx.txid
  );
  release();
}

async function commitTransaction(tx) {
  commitedTransactionIds = [...commitedTransactionIds, tx.txid];
}

function isCommited(txid) {
  console.log(
    "check if " + txid + " was commited",
    commitedTransactionIds.includes(txid)
  );
  return commitedTransactionIds.includes(txid);
}

function encodeTransaction(tx) {
  return [tx.txid, ...tx.openTransactionIds].join(",");
}

function decodeTransaction(raw) {
  const [rawId, ...txOpenTransactionIds] = raw.split(",");
  return new Transaction(
    parseInt(rawId, 10),
    txOpenTransactionIds.map(id => parseInt(id, 10))
  );
}

module.exports = {
  getReadTransaction,
  getWriteTransaction,
  commitTransaction,
  isCommited,
  encodeTransaction,
  decodeTransaction,
  releaseWriteTransaction
};
