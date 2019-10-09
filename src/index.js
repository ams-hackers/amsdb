const Koa = require("koa");
const bodyParser = require("koa-bodyparser");
const Router = require("@koa/router");

const { readKey, writeKey } = require("./access");
const { getReadTransactionId, getWriteTransactionId } = require("./txid");

const app = new Koa();
const router = new Router();

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

router.get("/read-transaction", async ctx => {
  ctx.body = {
    txid: getReadTransactionId()
  };
});

router.get("/keys/:key", async ctx => {
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

  const txid = txidString ? parseInt(txidString, 10) : getReadTransactionId();

  const version = await readKey(txid, key);

  if (!version) {
    onNotFound();
    return;
  } else {
    ctx.body = { status: "success", key, value: version.value };
  }
});

router.put("/keys/:key", async ctx => {
  const currentTransactionId = getWriteTransactionId();
  const { key } = ctx.params;
  await writeKey(currentTransactionId, key, ctx.request.body);
  ctx.body = { success: true };
});

app.use(router.routes());

console.log(`Starting database...`);
app.listen(3000);
