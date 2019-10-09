const locks = {};

class Lock {
  constructor(opts = {}) {
    this.queue = [];
    this.onClear = opts.onClear;
  }

  get queueLength() {
    return this.queue.length;
  }

  async acquire() {
    const release = () => {
      this.queue.shift();
      if (this.queue.length) {
        this.queue[0](release);
      } else {
        if (this.onClear) this.onClear();
      }
    };

    return new Promise(resolve => {
      this.queue.push(resolve);
      if (this.queue.length === 1) {
        resolve(release);
      }
    });
  }
}

async function acquireLock(key) {
  if (!(key in locks)) {
    locks[key] = new Lock({
      onClear: () => {
        delete locks[key];
      }
    });
  }
  return locks[key].acquire();
}

function getActiveLocks() {
  return Object.entries(locks);
}

exports.Lock = Lock;
exports.acquireLock = acquireLock;
exports.getActiveLocks = getActiveLocks;
