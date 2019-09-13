const fs = require("fs");
const path = require("path");
class MemoryStore {
  constructor(directory) {
    this.directory = directory;
    this.cached_db = {};
    fs.readdirSync(directory).forEach(file => {
      console.log(file);
      const raw = fs.readFileSync(path.resolve(directory, file), "utf-8");
      this.cached_db[file] = JSON.parse(raw);
    });
  }

  getKey(key) {
    const data = this.cached_db[key];

    if (!data) {
      console.log("not found", key);
      try {
        const raw = fs.readFileSync(path.resolve(this.directory, key), "utf-8");
        const value = JSON.parse(raw);
        return value;
      } catch (err) {
        console.log(err);
        return false;
      }
    }
    return data;
  }
  addKey(key, value) {
    fs.writeFile(
      path.resolve(this.directory, key),
      JSON.stringify(value),
      err => {
        if (err) throw err;
      }
    );
    this.cached_db[key] = value;
  }
}
module.exports = MemoryStore;
