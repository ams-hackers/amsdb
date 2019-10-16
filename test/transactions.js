const test = require("ava");

const { connect } = require("../client");

const db = connect("http://localhost:3000");

test.serial("don't read open writes", async t => {
  const davidTx = await db.writeTransaction();
  await davidTx.put("name", "david");
  await davidTx.commit();

  const txAlex = await db.writeTransaction();
  await txAlex.put("name", "alex");

  const visibleName = await db.get("name");
  await txAlex.commit();

  t.is(visibleName, "david");
});

test.serial("should be able to read own writes", async t => {
  const alexTx = await db.writeTransaction();
  await alexTx.put("name", "alex");

  const name = await alexTx.get("name");
  await alexTx.commit();
  t.is(name, "alex");
});
