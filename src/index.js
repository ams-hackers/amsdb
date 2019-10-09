const mkdir = require("mkdirp");
const fs = require("fs").promises;
const path = require("path");
const Koa = require("koa");
const bodyParser = require("koa-bodyparser");
const Router = require("@koa/router");

const { tmpName } = require("tmp-promise");
const { acquireLock } = require("./lock");

const DATA_DIR = "../data";

const app = new Koa();
const router = new Router();

mkdir.sync(DATA_DIR);

app.use(bodyParser());

const validateKey = key => /(\W-)+/g.test(key);

router.use(async (ctx, next) => {
  try {
    await next();
  } catch (err) {
    ctx.status = 500;
    ctx.body = {
      status: "error",
      message: err.message,
      stacktrace: err.stack
    };
  }
});

let nextAvailableTransactionId = 0;

router.get("/read-transaction", async ctx => {
  ctx.body = {
    txid: nextAvailableTransactionId
  };
});

router.get("/:key", async ctx => {
  const { key } = ctx.params;
  const { txid: txidString } = ctx.query;

  const isValidKey = !validateKey(key);

  if (!isValidKey) {
    ctx.status = 400;
    ctx.body = {
      status: "error",
      message: `Invalid key ${key}.`
    };
    return;
  }

  function onNotFound() {
    ctx.body = {
      status: "error",
      message: `The key ${key} does not exist.`
    };
  }

  try {
    const raw = await fs.readFile(path.resolve(DATA_DIR, key), "utf-8");

    const entries = raw
      .split("\n")
      .slice(0, -1)
      .map(line => JSON.parse(line));

    const txid = txidString
      ? parseInt(txidString, 10)
      : nextAvailableTransactionId;

    const visibleVersions = entries.filter(entry => entry.txid < txid);

    if (visibleVersions.length === 0) {
      onNotFound();
      return;
    } else {
      const currentVersion = visibleVersions[visibleVersions.length - 1];
      ctx.body = { status: "success", key, value: currentVersion.value };
    }
  } catch (err) {
    if (err.code === "ENOENT") {
      onNotFound();
    } else {
      throw err;
    }
  }
});

router.put("/:key", async ctx => {
  const currentTransactionId = ++nextAvailableTransactionId;

  const { key } = ctx.params;
  const raw = JSON.stringify({
    txid: currentTransactionId,
    value: ctx.request.body
  });

  const tmp = await tmpName();
  const out = path.resolve(DATA_DIR, key);

  const release = await acquireLock(key);
  const fh = await fs.open(out, "a");
  await fh.writeFile(raw + "\n");
  await fh.sync();
  await fh.close();
  release();
  ctx.body = { success: true };
});

app.use(router.routes());

console.log(`Starting database...`);
app.listen(3000);
