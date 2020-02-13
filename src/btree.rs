//! Append-only B+Tree
//!
//! This module implements a B+Tree.
//!
//! ```text
//!     +--+-----+--+-----+--+
//!     |  | k_i |  | k_j |  |          branch nodes
//!     +--+-----+--+-----+--+
//!      /          \        \__
//!     /            \           \
//!    /              \           \
//! +---+---+--   +---+---+--
//! | K | V | ..  | K | V | ..          data nodes
//! +---+---+--   +---+---+--
//!
//! ```
//!
//! ## Page Header
//!
//! ````text
//! |---------|------------|-----------|----------|
//! | is_root | is_branch  | used_size | reserved |
//! | 1 bit   | 1 bit      | u10       | ...      |
//! |---------|------------|-----------|----------|
//! ````
//!
//! | Offset  | Size | Description |
//! | ------- | ---- | ----------- |
//! | 0       | 1    | `1` if the current page is a root |
//! | 1       | 1    | `1` if the current page is a branch node |
//!
//! ## B+Tree reading
//!
//! - <https://en.wikipedia.org/wiki/B%2B_tree>
//!
//! - <https://www.cs.usfca.edu/~galles/visualization/BPlusTree.html>
//!
//!   A tool to visualization B+Tree operations.
//!
//! - <http://www.bzero.se/ldapd/btree.html>
//!
//!    A short description of the append-only variant of the B+Tree.
//!

use crate::pager::{Page, Pager, PAGE_SIZE};

pub type Key = Vec<u8>;
pub type Value = Vec<u8>;

type NodeIdx = u64;

/// A B+Tree.
pub struct BTree {
    pager: Pager,
}

/// Either a branch or a data node.
enum BTreeNode {
    Branch(BranchNode),
    Data(DataNode),
}

impl BTree {
    /// Read a node given its index.
    fn read_node(nth: NodeIdx) -> BTreeNode {
        todo!()
    }

    pub fn get(&self, key: &Key) -> &Value {
        todo!()
    }

    pub fn put(&mut self, key: Key, value: Value) {
        todo!()
    }
}

impl BTreeNode {
    /// Check if a node is a root.
    fn is_root(&self) -> bool {
        todo!()
    }
}

/// The result of inserting an entry in a node.
///
/// It can yield an updated node, a split node.
///
enum InsertResult<A> {
    SingleNode(A),
    SplitNode(A, A),
}

/// Return a path in the B+Tree to where the bucket for a key belongs.
///
/// This is one of the main functions of the B+Tree implementation,
/// used both to find the value of a key as well as to insert and
/// update new items.
///
/// The callback `f` will be invoked for each branch node
/// visited. When we are only interested in reading a value, we can
/// pass a no-op closure to prevent allocation.
///
fn lookup_path<F>(root: &Page, key: &Key, f: F) -> (NodeIdx, DataNode)
where
    F: Fn(NodeIdx, BranchNode),
{
    todo!()
}

/// Branch node
///
/// A branch node is an internal node in the B+Tree. It does not
/// contain actual data, but instead contain entries to route key
/// lookups to other branch nodes or data nodes.
///
/// The format of a branch node is
///
/// ```text
/// +--------+---------+---------+-----+---------+---------+-----+---------+
/// | header | NodeIdx | keySize | key | NodeIdx | KeySize | Key | NodeIdx |
/// |--------|---------|---------|-----|---------|---------|-----|---------|
/// | u64    | u64     | u8            | u64     | u8            | u64     |
/// +--------+---------+---------+-----+---------+---------+-----+---------+
/// ```
///
/// Branch nodes contain a sequence of node indexes separated by keys.
///
/// A branch node will route the search for a given key `k` by finding
/// a pair of keys `(k_1, k_2) such that `k1 <= k < k2` and then
/// reading the node whose node index is between `k_1` and `k_2`.
///
///
struct BranchNode(Page);

struct BranchNodeEntry {
    left: NodeIdx,
    key_separator: Key,
    right: NodeIdx,
}
impl BranchNode {
    /// Create a branch node linking to two nodes separated by a key.
    fn new(entry: BranchNodeEntry) -> BranchNode {
        todo!()
    }

    /// Replace the `old_node_index` with a new entry of the form
    /// `(new_node_index_1, key, new_node_index_2)`
    fn insert(
        &self,
        old_node_idx: NodeIdx,
        new_entry: BranchNodeEntry,
    ) -> InsertResult<BranchNode> {
        todo!()
    }

    /// Find the node index for the subtree containing `key`.
    fn lookup(&self, key: &Key) -> Option<NodeIdx> {
        todo!()
    }
}

/// Data node
///
/// Data node are the leaves of the B+Tree. They store the data.
///
/// The basic format of a data node is:
///
/// ```text
/// +--------+---------------+-------------------+---------------+-------------------+
/// | header | keySize + Key | ValueSize + Value | keySize + Key | ValueSize + Value |
/// | u64    | u8            | u16               | u8            | u16               |
/// +--------+---------------+-------------------+---------------+-------------------+
/// ```
///
struct DataNode(Page);

impl DataNode {
    fn new() -> DataNode {
        todo!()
    }

    /// Insert a key-value pair.
    fn insert(&mut self, key: &Key, value: &Value) -> InsertResult<DataNode> {
        todo!()
    }

    /// Find the value for `key` if it is there.
    fn lookup<'a>(&'a self, key: &Key) -> Option<&'a Value> {
        todo!()
    }
}
