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
