const assert = require("assert");
const fs = require("fs").promises;
const {
  O_TRUNC,
  O_RDWR,
  O_CREAT,
  O_NOATIME,
  O_APPEND
} = require("fs").constants;
const { Block, BLOCK_SIZE } = require("./block");

let fh;
async function openDB() {
  fh = await fs.open(
    "data.bin",
    O_RDWR | O_CREAT | O_NOATIME | O_APPEND | O_TRUNC
  );
}

async function blockCount() {
  const stat = await fh.stat();
  return Math.trunc(stat.size / BLOCK_SIZE);
}

async function readBlock(blockPosition) {
  const buffer = Buffer.alloc(BLOCK_SIZE);
  await fh.read(buffer, 0, BLOCK_SIZE, BLOCK_SIZE * blockPosition);
  return Block.decode(buffer);
}

async function writeBlock(block) {
  const position = blockCount();
  const buffer = block.encode();
  await fh.write(buffer);
  return position;
}

function encodeBlockPosition(position) {
  const buffer = Buffer.alloc(4);
  buffer.writeUInt32LE(position);
  return buffer;
}

function decodeBlockPosition(buffer) {
  if (buffer.length !== 4) {
    throw new Error(`Buffer should have length 4`);
  }
  return buffer.readUInt32LE();
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
  root.insertStrings("D", "4444444444444444444444444444");
  root.insertStrings("E", "5555555555555555555555555555");
  root.insertStrings("F", "6666666666666666666666666666");
  root.insertStrings("G", "7777777777777777777777777777");
  root.insertStrings("H", "8888888888888888888888888888");

  await writeBlock(root);
}

async function operation3() {
  //
  // Read the root
  //
  const root = await readBlock((await blockCount()) - 1);

  const key = "X";
  const value =
    "ZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZ";

  const fits = root.insertStrings(key, value);

  if (fits) {
    await writeBlock(root);
    return true;
  } else {
    const entries = root.entries.slice();
    entries.push({ key: Buffer.from(key), value: Buffer.from(value) });
    entries.sort((e1, e2) => e1.key.compare(e2.key));

    const left = Block.make();
    while (left.getUsage() < 0.5) {
      const entry = entries.shift();
      const fits = left.insert(entry.key, entry.value);
      assert(fits, "Fits in left node");
    }

    const right = Block.make();
    while (entries.length) {
      const entry = entries.shift();
      const fits = right.insert(entry.key, entry.value);
      assert(fits, "Fits in right node");
    }

    const leftOffset = await writeBlock(left);
    const rightOffset = await writeBlock(right);

    console.log("Left:", leftOffset.toString("16"));
    console.log("Right:", rightOffset.toString("16"));

    const newRoot = Block.make(true);
    const leftBound = right.entries[0].key;
    newRoot.insert(Buffer.alloc(0), encodeBlockPosition(leftOffset));
    newRoot.insert(Buffer.from(leftBound), encodeBlockPosition(rightOffset));

    await writeBlock(newRoot);
  }
}

async function operation4() {
  const root = await readBlock((await blockCount()) - 1);
  assert(root.flags === 1, "Last block should be root");
  root.entries.forEach(entry => {
    const { key, value } = entry;
    console.log(key.toString(), "->", decodeBlockPosition(value));
  });
}

const start = async () => {
  await openDB();

  await operation1();
  await operation2();
  await operation3();
  await operation4();

  await fh.close();
};

start();
