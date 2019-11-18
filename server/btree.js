const fs = require("fs").promises;
const {
  O_TRUNC,
  O_RDWR,
  O_CREAT,
  O_NOATIME,
  O_APPEND
} = require("fs").constants;

const KB = 1024;
const WORD = 4;
const BLOCK_SIZE = 512;

let fh;

async function openDB() {
  fh = await fs.open(
    "data.bin",
    O_RDWR | O_CREAT | O_NOATIME | O_APPEND | O_TRUNC
  );
}

//
// Write and read bytes/words/slices from a block sequentially
//
class BlockCursor {
  constructor(block, offset = 0) {
    this.block = block;
    this.offset = offset;
  }

  checkOverflow() {
    if (this.offset >= this.block.length) {
      throw new Error(`Overflow!`);
    }
  }

  // Reads

  readUInt16() {
    let value = this.block.readUInt16LE(this.offset);
    this.offset += 2;
    this.checkOverflow();
    return value;
  }
  readUInt32() {
    let value = this.block.readUInt32LE(this.offset);
    this.offset += 4;
    this.checkOverflow();
    return value;
  }
  readBytes(size) {
    let slice = this.block.slice(this.offset, this.offset + size);
    this.offset += size;
    this.checkOverflow();
    return slice;
  }

  // Writes

  writeUInt16(value) {
    this.block.writeUInt16LE(value, this.offset);
    this.offset += 2;
    this.checkOverflow();
  }
  writeUInt32(value) {
    this.block.writeUInt32LE(value, this.offset);
    this.offset += 4;
    this.checkOverflow();
  }
  writeBytes(buffer) {
    buffer.copy(this.block, this.offset);
    this.offset += buffer.length;
    this.checkOverflow();
  }
}

//
// Block
//
//
// Format:
//
//  2 bytes  2 bytes    4 bytes    4 bytes   k1 bytes   v1 bytes
// +--------+---------+----------+----------+----------+----------
// | flags  |   free  |  k1 size | v1 size  | key1 ... | value1 ....
// +--------+---------+----------+----------+----------+----------
// |                  |
//  <---- header ----> <---------------- entry ------------------->
//
//
const BLOCK_HEADER_SIZE = 4;

function getEntrySize(key, value) {
  return key.length + value.length + 2 * WORD;
}

class Block {
  constructor(flags, freeOffset, entries) {
    this.flags = flags;
    this.entries = entries;
    this.freeOffset = freeOffset;
  }

  encode() {
    const buffer = Buffer.alloc(BLOCK_SIZE);
    const cursor = new BlockCursor(buffer);

    cursor.writeUInt16(this.flags);
    cursor.writeUInt16(this.freeOffset);

    this.entries.forEach(e => {
      cursor.writeUInt32(e.key.length);
      cursor.writeUInt32(e.value.length);
      cursor.writeBytes(e.key);
      cursor.writeBytes(e.value);
    });

    return buffer;
  }

  insert(key, value) {
    const newFreeOfset = this.freeOffset + getEntrySize(key, value);

    if (newFreeOfset < BLOCK_SIZE) {
      this.entries.push({ key, value });
      this.entries.sort((e1, e2) => e1.key.compare(e2.key));
      this.freeOffset = newFreeOfset;
      return true;
    } else {
      return false;
    }
  }

  insertStrings(key, value) {
    return this.insert(Buffer.from(key), Buffer.from(value));
  }

  static make() {
    return new Block(0, BLOCK_HEADER_SIZE, []);
  }

  static decode(buffer) {
    const cursor = new BlockCursor(buffer);
    const flags = cursor.readUInt16();
    const freeOffset = cursor.readUInt16();

    let entries = [];

    while (cursor.offset < freeOffset) {
      const keySize = cursor.readUInt32();
      const valueSize = cursor.readUInt32();

      const key = cursor.readBytes(keySize);
      const value = cursor.readBytes(valueSize);
      entries.push({ key, value });
    }

    return new Block(flags, freeOffset, entries);
  }
}

async function readBlock(blockPosition) {
  const buffer = Buffer.alloc(BLOCK_SIZE);
  await fh.read(buffer, 0, BLOCK_SIZE, BLOCK_SIZE * blockPosition);
  return Block.decode(buffer);
}

async function blockCount() {
  const stat = await fh.stat();
  return Math.trunc(stat.size / BLOCK_SIZE);
}

async function writeBlock(block) {
  const position = blockCount();
  const buffer = block.encode();
  await fh.write(buffer);
  return position;
}

function splitBlockAndInsert(block, key, value) {
  const left = Block.make();
  const right = Block.make();

  const entries = [block.entries];

  while (left.freeOffset <= Math.floor(BLOCK_SIZE / 2)) {
    const entry = block.entries.shift();
    left.insert(entry.key, entry.value);
  }

  while (entries.length > 0) {
    const entry = block.entries.shift();
    right.insert(entry.key, entry.value);
  }

  return [left, right];
}

//
// Some experiments
//

async function operation1() {
  // Create an empty database
  const root_ = Block.make();
  writeBlock(root_);
}

async function operation2() {
  //
  // Read the root
  //
  const root = await readBlock((await blockCount()) - 1);

  // Create a new node with a few entries
  root.insertStrings("A", "1111111111111111111111111111");
  root.insertStrings("B", "2222222222222222222222222222");
  root.insertStrings("C", "3333333333333333333333333333");

  await writeBlock(root);
}

async function operation3() {
  //
  // Read the root
  //
  const root = await readBlock((await blockCount()) - 1);

  const fits = root.insertStrings(
    "D",
    "ZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZ"
  );

  if (fits) {
    await writeBlock(root);
    return true;
  } else {
    const [left, right] = splitBlock(root);
  }
}

const start = async () => {
  await openDB();

  await operation1();
  await operation2();
  await operation3();

  await fh.close();
};

start();
