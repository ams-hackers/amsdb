const mkdir = require("mkdirp");
const fs = require("fs").promises;
const path = require("path");
const Koa = require("koa");
const bodyParser = require("koa-bodyparser");
const Router = require("@koa/router");

const { tmpName } = require("tmp-promise");

const DATA_DIR = "./data";

const app = new Koa();
const router = new Router();

mkdir.sync(DATA_DIR);

app.use(bodyParser());

const validateKey = key => /\W+/g.test(key);

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

router.get("/:key", async ctx => {
  const { key } = ctx.params;

  const isValidKey = !validateKey(key);

  if (!isValidKey) {
    ctx.status = 401;
    ctx.body = {
      status: "error",
      message: `Invalid key ${key}.`
    };
    return;
  }

  try {
    const raw = await fs.readFile(path.resolve(DATA_DIR, key), "utf-8");
    const value = JSON.parse(raw);
    ctx.body = { status: "success", key, value };
  } catch (err) {
    if (err.code === "ENOENT") {
      ctx.body = {
        status: "error",
        message: `The key ${key} does not exist.`
      };
    } else {
      throw err;
    }
  }
});

router.put("/:key", async ctx => {
  const { key } = ctx.params;
  const raw = JSON.stringify(ctx.request.body);

  const tmp = await tmpName();
  const out = path.resolve(DATA_DIR, key);

  await fs.writeFile(tmp, raw);
  await fs.rename(tmp, out);

  ctx.body = { success: true };
});

app.use(router.routes());

console.log(`Starting database...`);
app.listen(3000);
