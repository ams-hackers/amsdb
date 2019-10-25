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

class MRSWLock {
  constructor() {
    this.lock = new Lock();

    this.acquireSharedPromise = undefined;
    this.sharedCount = 0;
  }

  async acquireExclusive() {
    this.acquireSharedPromise = undefined;
    return this.lock.acquire();
  }

  async acquireShared() {
    if (!this.acquireSharedPromise) {
      this.acquireSharedPromise = this.lock.acquire();
    }

    return this.acquireSharedPromise.then(release => {
      this.sharedCount++;

      return () => {
        this.sharedCount--;
        if (this.sharedCount === 0) {
          this.acquireSharedPromise = undefined;
          release();
        }
      };
    });
  }
}

exports.Lock = Lock;
exports.MRSWLock = MRSWLock;
