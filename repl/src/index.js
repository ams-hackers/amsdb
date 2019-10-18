const repl = require("repl");
const client = require("amsdb-client");

const db = client.connect("http://localhost:3000");
let tx;

const handlers = {
  BEGIN: async args => {
    const [mode] = args;
    switch (mode.toUpperCase()) {
      case "READ":
        tx = await db.readTransaction();
        break;
      case "WRITE":
        tx = await db.writeTransaction();
        break;
      default:
        throw new Error(`Unknown mode ${mode}`);
    }
    return "ok";
  },
  COMMIT: async () => {
    if (tx) {
      await tx.commit();
      tx = null;
    } else {
      throw new Error(`Not inside a transaction`);
    }
    return "ok";
  },
  ROLLBACK: async () => {
    if (tx) {
      await tx.rollback();
      tx = null;
    } else {
      throw new Error(`Not inside a transaction`);
    }
    return "ok";
  },
  GET: async args => {
    const [key] = args;
    const get = tx ? tx.get.bind(tx) : db.get.bind(db);
    const value = await get(key);
    return value;
  },
  PUT: async args => {
    const [key, value] = args;
    if (tx && tx.put) {
      await tx.put(key, JSON.parse(value));
    } else {
      throw new Error(`Not inside a write transaction`);
    }

    return "ok";
  }
};

async function evalCommand(input) {
  const [_cmd, ...args] = input.split(/\s+/);
  const cmd = _cmd.toUpperCase();
  if (cmd in handlers) {
    return handlers[cmd](args);
  } else {
    throw new Error("Unknown command");
  }
}

const amsdbRepl = repl.start({
  prompt: "> ",
  input: process.stdin,
  output: process.stdout,
  eval: (input, context, filename, callback) => {
    evalCommand(input)
      .then(result => {
        callback(null, result);
      })
      .catch(err => {
        callback(err.message);
      })
      .finally(() => {
        amsdbRepl.setPrompt(tx ? `${tx.token}> ` : "> ");
        amsdbRepl.prompt();
      });
  }
});
