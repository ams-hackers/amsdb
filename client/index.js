const axios = require("axios");
const http = require("http");

async function getKey(request, token, key) {
  const params = { token };
  const response = await request.get(`/keys/${key}`, { params });
  if (response.data.value) {
    return response.data.value.value;
  } else {
    throw new Error(response.data.message);
  }
}

async function putKey(request, token, key, value) {
  const params = { token };
  await request.put(`/keys/${key}`, { value }, { params });
  return;
}

async function listKeys(request, token, prefix) {
  const params = { token, prefix };
  const response = await request.get(`/keys`, { params });
  return response.data;
}

class Connection {
  constructor(request) {
    this.request = request;
  }

  async get(key) {
    return getKey(this.request, undefined, key);
  }

  async list(prefix) {
    return listKeys(this.request, undefined, prefix);
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
  list(prefix) {
    return listKeys(this.request, this.token, prefix);
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
    headers: { "Content-Type": "application/json" },
    httpAgent: new http.Agent({ keepAlive: true })
  });
  return new Connection(request);
}

module.exports = { connect };
