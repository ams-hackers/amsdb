const fs = require("fs").promises;

const KB = 1024;

const BLOCK_SIZE = 4 * KB;

const insertIntoBlock = (buffer, key, value) => {
  const records = buffer
    .toString("utf8")
    .split("\n")
    .map(JSON.parse);

  const newRecords = [...records, { key, value }].sort((a, b) => {
    return a.key < b.key ? -1 : a.key === b.key ? 0 : 1;
  });

  const encodedRecords = newRecords.map(JSON.stringify).join("\n");

  if (encodedRecords.length > BLOCK_SIZE) {
    throw new Error("I don't eat meat");
  }

  buffer.fill(0x20, 0, BLOCK_SIZE);

  for (let i = 0; i < encodedRecords.length; i++) {
    buffer[i] = encodedRecords[i];
  }

  return buffer;
};

const readBlock = async (fh, blockPosition) => {
  const buffer = new Uint8Array(BLOCK_SIZE);
  await fh.read(buffer, 0, BLOCK_SIZE, BLOCK_SIZE * blockPosition);
  return buffer;
};

const writeBlock = (fh, buffer, blockPosition) => {
  return fh.write(buffer, 0, BLOCK_SIZE, BLOCK_SIZE * blockPosition);
};

const start = async () => {
  const fh = await fs.open("foo", "r+");

  await writeBlock(fh, new Uint8Array(BLOCK_SIZE).fill(1), 1);
  const fileContent = await readBlock(fh, 1);

  await fh.close();
};

start();
