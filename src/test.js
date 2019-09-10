const axios = require("axios");
const http = require("http");
const util = require("util");
var casual = require("casual");

const request = axios.create({
  baseURL: "http://localhost:3000"
});

async function test() {
  const key = casual.word;

  await request.put(`/${key}`, { name: casual.full_name });

  const response = await request.get(`/${key}`);
  console.log(response.data);
}

test().catch(err => {
  console.error(err.message);
  process.exit(-1);
});
