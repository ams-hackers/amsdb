const KB = 1024;
const WORD = 4;
const BLOCK_SIZE = 512;

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
const BLOCK_DATA_SIZE = BLOCK_SIZE - BLOCK_HEADER_SIZE;
const ENTRY_HEADER_SIZE = 8;

const MAX_ENTRY_SIZE = Math.floor(BLOCK_DATA_SIZE / 2);

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
    const entrySize = getEntrySize(key, value);
    if (entrySize > MAX_ENTRY_SIZE) {
      throw new Error(`Entry should be smaller than ${MAX_ENTRY_SIZE} bytes`);
    }

    const newFreeOfset = this.freeOffset + entrySize;
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

  getUsage() {
    return (this.freeOffset - BLOCK_HEADER_SIZE) / BLOCK_DATA_SIZE;
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

module.exports = { Block, BLOCK_SIZE };
