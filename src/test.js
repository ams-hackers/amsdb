const { performance } = require("perf_hooks");
const http = require("http");
const axios = require("axios");
const casual = require("casual");
const Bluebird = require("bluebird");

const request = axios.create({
  baseURL: "http://localhost:3000",
  httpAgent: new http.Agent({ keepAlive: true })
});

async function test() {
  const key = casual.word;
  await request.put(`/${key}`, { name: casual.full_name });
  const start = performance.now();
  const response = await request.get(`/${key}`);
  const end = performance.now();
  console.log(end - start + " ms");
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
  { concurrency: 10 }
);
