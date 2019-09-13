const mkdir = require("mkdirp");
const path = require("path");
const Koa = require("koa");
const bodyParser = require("koa-bodyparser");
const Router = require("@koa/router");
const MemoryStore = require("./memory-store");

const DATA_DIR = "./data";

const app = new Koa();
const router = new Router();

mkdir.sync(DATA_DIR);

const memoryStore = new MemoryStore(path.resolve(DATA_DIR));

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
  } else {
    const keyData = memoryStore.getKey(key);
    if (keyData) {
      ctx.body = { status: "success", key, keyData };
      return;
    } else {
      ctx.body = {
        status: "error",
        message: `The key ${key} does not exist.`
      };
    }
  }
});

router.put("/:key", async ctx => {
  const { key } = ctx.params;
  memoryStore.addKey(key, ctx.request.body);
  ctx.body = { success: true };
});

app.use(router.routes());

console.log(`Starting database...`);
app.listen(3000);
