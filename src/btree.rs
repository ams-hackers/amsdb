use crate::Pager;

use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize)]
enum Node {
    Branch {
        is_root: bool,
        keys: Vec<Vec<u8>>,
        values: Vec<Vec<u8>>,
    },
    Leaf {
        keys: Vec<Vec<u8>>,
        values: Vec<Vec<u8>>,
    },
}

struct BTree {
    pager: Pager,
}

impl BTree {
    pub fn get(&self, key: &[u8]) -> &[u8] {
        todo!("Not implemented");
    }

    pub fn put(&mut self, key: &[u8], value: &[u8]) {
        todo!("Not implemented");
    }
}

#[cfg(test)]
mod test {
    use super::*;

    #[test]
    fn test_node_serialize() {
        let branch = Node::Branch {
            is_root: true,
            keys: vec![vec![1, 2, 3], vec![4, 5, 6]],
            values: vec![vec![9, 8]],
        };
        let encoded = bincode::serialize(&branch).expect("Failed to serialize");

        println!("Encoded: {:?}", encoded);
    }
}
