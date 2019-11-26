const assert = require("assert");
const fs = require("fs").promises;
const {
  O_TRUNC,
  O_RDWR,
  O_CREAT,
  O_NOATIME,
  O_APPEND
} = require("fs").constants;
const { getEntrySize, Block, BLOCK_SIZE } = require("./block");

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

async function getRootBlockPosition() {
  return (await blockCount()) - 1;
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

async function insertKeyValue(key, value) {
  //
  // Read the root
  //
  const root = await readBlock(await getRootBlockPosition());

  const fits = root.insertStrings(key, value);

  if (fits) {
    await writeBlock(root);
    return true;
  } else {
    const entries = root.entries.slice();
    entries.push({ key: Buffer.from(key), value: Buffer.from(value) });
    entries.sort((e1, e2) => e1.key.compare(e2.key));

    const entriesTotalSize = entries
      .map(e => getEntrySize(e.key, e.value))
      .reduce((s1, s2) => s1 + s2, 0);

    let leftSize = 0;
    let rightSize = entriesTotalSize;

    const left = Block.make();
    const right = Block.make();

    while (true) {
      const entry = entries[0];
      const entrySize = getEntrySize(entry.key, entry.value);

      // We will stop the loop when movig the next entry will make the
      // sizes of the blocks more different than they are now
      if (
        Math.abs(leftSize + entrySize - (rightSize - entrySize)) >=
        Math.abs(leftSize - rightSize)
      ) {
        break;
      }

      entries.shift();
      const fits = left.insert(entry.key, entry.value);
      assert(fits, "Fits in left node");
      leftSize += entrySize;
      rightSize -= entrySize;
    }

    while (entries.length > 0) {
      const entry = entries.shift();
      const fits = right.insert(entry.key, entry.value);
      assert(fits, "Fits in right node");
    }

    const leftOffset = await writeBlock(left);
    const rightOffset = await writeBlock(right);

    const newRoot = Block.make(true);
    const leftBound = right.entries[0].key;

    newRoot.insertSentinelEntry(leftOffset);
    newRoot.insertOffset(Buffer.from(leftBound), rightOffset);

    await writeBlock(newRoot);
  }
}

async function lookupKeyFromBlockPosition(position, key) {
  const block = await readBlock(position);
  if (block.flags === 1) {
    // branch
    for (let i = 0; i < block.entries.length; i++) {
      const leftBound = block.entries[i].key;
      const rightBound = block.entries[i + 1] && block.entries[i + 1].key;
      if (
        key.compare(leftBound) >= 0 &&
        (!rightBound || key.compare(rightBound) < 0)
      ) {
        const childPosition = decodeBlockPosition(block.entries[i].value);
        const res = await lookupKeyFromBlockPosition(childPosition, key);
        return {
          path: [position, ...res.path],
          value: res.value
        };
      }
    }
  } else {
    // data
    for (let i = 0; i < block.entries.length; i++) {
      if (key.compare(block.entries[i].key) === 0) {
        return { path: [position], value: block.entries[i].value };
      }
    }
    throw new Error(`Key ${key} not found`);
  }
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
  const root = await readBlock(await getRootBlockPosition());

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
  const key = "X";
  const value =
    "ZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZ";

  await insertKeyValue(key, value);
}

async function operation4() {
  const root = await readBlock(await getRootBlockPosition());
  assert(root.flags === 1, "Last block should be branch");
  root.entries.forEach(entry => {
    const { key, value } = entry;
    console.log(key.toString(), "->", decodeBlockPosition(value));
  });
}

async function operation5() {
  const key = Buffer.from("H");
  const res = await lookupKeyFromBlockPosition(
    await getRootBlockPosition(),
    key
  );
  console.log({ key, path: res.path, value: res.value.toString() });
}

const start = async () => {
  await openDB();

  await operation1();
  await operation2();
  await operation3();
  await operation4();
  await operation5();

  await fh.close();
};

start();
