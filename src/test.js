const { performance } = require("perf_hooks");
const http = require("http");
const axios = require("axios");
const casual = require("casual");
const Bluebird = require("bluebird");

const request = axios.create({
  baseURL: "http://localhost:3000",
  httpAgent: new http.Agent({ keepAlive: true })
});

let total = 0;
let count = 0;

async function test() {
  const key = casual.word;
  const start = performance.now();
  await request.put(`/keys/${key}`, { name: casual.sentences(500) });
  const response = await request.get(`/keys/${key}`);
  const end = performance.now();
  total += end - start;
  count++;
}

Bluebird.map(
  new Array(1000),
  i => {
    return test().catch(err => {
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
