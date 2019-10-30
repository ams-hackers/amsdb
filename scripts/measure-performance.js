const { performance } = require("perf_hooks");
const casual = require("casual");
const Bluebird = require("bluebird");
const { connect } = require("amsdb-client");

const db = connect("http://localhost:3000");

let total = 0;
let count = 0;

async function putGetKey(n) {
  const key = `marble-${n}`;
  const start = performance.now();
  const tx = await db.writeTransaction();
  await tx.put(key, { name: casual.sentences(500) });
  await tx.commit();
  await db.get(key);
  const end = performance.now();
  console.log(`Put ${n}`);
  total += end - start;
  count++;
}

let n = 0;
Bluebird.map(
  new Array(10000),
  () => {
    return putGetKey(++n).catch(err => {
      console.error(err.message);
      console.error(err.stack);
      console.error(err);
      process.exit(-1);
    });
  },
  { concurrency: 100 }
).then(() => {
  const average = total / count;
  console.log(`Average: ${average} ms`);
});
