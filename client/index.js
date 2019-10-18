const axios = require("axios");

async function getKey(request, token, key) {
  let query = token ? `?token=${token}` : "";
  const response = await request.get(`/keys/${key}${query}`);
  if (response.data.value) {
    return response.data.value.value;
  } else {
    throw new Error(response.data.message);
  }
}

async function putKey(request, token, key, value) {
  let query = token ? `?token=${token}` : "";
  await request.put(`/keys/${key}${query}`, { value });
  return;
}

class Connection {
  constructor(request) {
    this.request = request;
  }

  async get(key) {
    return getKey(this.request, undefined, key);
  }

  async writeTransaction() {
    const response = await this.request.post("/begin-write-transaction");
    const token = response.data;
    return new WriteTransaction(this.request, token);
  }

  async readTransaction() {
    const response = await this.request.get("/read-transaction");
    const token = response.data;
    return new ReadTransaction(this.request, token);
  }
}

class ReadTransaction {
  constructor(request, token) {
    this.request = request;
    this.token = token;
  }
  get(key) {
    return getKey(this.request, this.token, key);
  }
}

class WriteTransaction extends ReadTransaction {
  put(key, value) {
    return putKey(this.request, this.token, key, value);
  }
  commit() {
    return this.request.post(`/close-write-transaction?token=${this.token}`);
  }
  rollback() {
    return this.request.post(
      `/close-write-transaction?token=${this.token}&rollback`
    );
  }
}

function connect(host) {
  const request = axios.create({
    baseURL: host,
    headers: { "Content-Type": "application/json" }
  });
  return new Connection(request);
}

module.exports = { connect };
