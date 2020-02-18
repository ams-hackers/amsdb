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
use std::convert::TryInto;

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
    fn new(is_root: bool) -> DataNode {
        let mut header = (8u64 << 2);
        //        println!("{:?}", header);

        if is_root {
            header |= 1u64;
        }

        let header = header.to_le_bytes();
        //        println!("{:?}", header);

        let mut binary = [0u8; PAGE_SIZE as usize];
        for (idx, item) in header.iter().enumerate() {
            binary[idx] = *item;
        }
        //        binary[5] = 12u8;
        DataNode(binary)
    }

    fn read_header(&self) -> u64 {
        let head_array = [
            self.0[0], self.0[1], self.0[2], self.0[3], self.0[4], self.0[5], self.0[6], self.0[7],
        ];
        let header = u64::from_le_bytes(head_array);
        header
    }

    fn read_used_size(&self) -> u16 {
        let header = self.read_header();
        let used_size = header >> 2 & 0b1111111111;
        used_size.try_into().unwrap()
    }

    fn write_used_size(&mut self, used_size: u64) {
        let header = (used_size << 2) | self.read_header();
        let head_array = header.to_le_bytes();
        for (ix, n) in head_array.iter().enumerate() {
            self.0[ix] = *n;
        }
    }

    fn write_array_at(&mut self, data: &[u8], offset: &mut usize) {
        for (_, x) in data.iter().enumerate() {
            self.0[*offset] = *x;
            *offset += 1;
        }
    }

    fn write_u8_at(&mut self, data: u8, offset: &mut usize) {
        self.0[*offset] = data;
        *offset += 1;
    }

    fn write_u16_at(&mut self, data: u16, offset: &mut usize) {
        let [lo, hi] = data.to_le_bytes();
        self.0[*offset] = lo;
        *offset += 1;
        self.0[*offset] = hi;
        *offset += 1;
    }

    /// Insert a key-value pair.
    fn insert(&mut self, key: &Key, value: &Value) {
        let mut offset = self.read_used_size() as usize;

        let key_size: u8 = key.len().try_into().unwrap();
        self.write_u8_at(key_size, &mut offset);
        self.write_array_at(key, &mut offset);

        let value_size: u16 = value.len().try_into().unwrap();
        self.write_u16_at(value_size, &mut offset);
        self.write_array_at(value, &mut offset);

        self.write_used_size(offset as u64);

        println!("{:?}", &self.0[..]);
    }

    /// Find the value for `key` if it is there.
    fn lookup<'a>(&'a self, key: &Key) -> Option<&'a Value> {
        todo!()
    }
}

#[cfg(test)]
mod test {
    use super::*;

    #[test]
    fn create_new_datanode() {
        let mut dnode = DataNode::new(true);
        dnode.insert(&vec![7, 8], &vec![8, 9]);
        dnode.insert(&vec![7, 8], &vec![8, 9]);
    }
}
