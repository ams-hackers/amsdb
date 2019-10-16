const Koa = require("koa");
const bodyParser = require("koa-bodyparser");
const Router = require("@koa/router");

const { readKey, writeKey } = require("./access");
const {
  decodeTransaction,
  encodeTransaction,
  getReadTransaction,
  getWriteTransaction,
  releaseWriteTransaction
} = require("./transactions");

const app = new Koa();
const router = new Router();

app.use(bodyParser());

const validateKey = key => /(\W-)+/g.test(key);

// https://github.com/koajs/koa/wiki/Error-Handling#catching-downstream-errors
app.use(async (ctx, next) => {
  try {
    await next();
  } catch (err) {
    ctx.status = err.status || 500;
    ctx.body = err.message;
    ctx.app.emit("error", err, ctx);
  }
});

router.get("/read-transaction", async ctx => {
  const tx = await getReadTransaction();
  ctx.body = encodeTransaction(tx);
});

router.get("/keys/:key", async ctx => {
  const { key } = ctx.params;
  const { token } = ctx.query;

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

  const tx = token ? decodeTransaction(token) : await getReadTransaction();

  const version = await readKey(tx, key);

  if (!version) {
    onNotFound();
    return;
  } else {
    ctx.body = { status: "success", key, value: version.value };
  }
});

router.put("/keys/:key", async ctx => {
  const { token } = ctx.query;
  const { key } = ctx.params;
  const tx = decodeTransaction(token);
  await writeKey(tx, key, ctx.request.body);
  ctx.body = { success: true };
});

router.post("/begin-write-transaction", async ctx => {
  const tx = await getWriteTransaction();
  ctx.body = encodeTransaction(tx);
});

router.post("/close-write-transaction", async ctx => {
  const { token } = ctx.query;
  const tx = decodeTransaction(token);
  releaseWriteTransaction(tx);
  ctx.body = "ok";
});

app.use(router.routes());

console.log(`Starting database...`);
app.listen(3000);
