const { performance } = require("perf_hooks");
const { connect } = require("amsdb-client");

const db = connect("http://localhost:3000");

let total = 0;
let count = 0;

async function listAllKeys(prefix) {
  const start = performance.now();
  const keys = await db.list(prefix);
  console.log(keys);
  const end = performance.now();
  total += end - start;
  count++;
}

listAllKeys("marble-1").then(x => {
  console.log(`Total: ${total} ms`);
});
