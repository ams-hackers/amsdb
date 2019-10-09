let nextAvailableTransactionId = 0;

function getReadTransactionId() {
  return nextAvailableTransactionId;
}

function getWriteTransactionId() {
  return ++nextAvailableTransactionId;
}

module.exports = { getReadTransactionId, getWriteTransactionId };
