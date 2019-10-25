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

exports.Lock = Lock;
