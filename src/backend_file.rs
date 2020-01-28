//! An experimental database written in Rust
//!
//! Support:
//!   - In-memory key-value store
//!   - Persistence on-disk *B+Tree* (in the future :-)
//!

use std::fs;
use std::fs::File;
use std::io::prelude::*;
use std::path::{Path, PathBuf};

use std::collections::HashMap;

/// A instance of a database.
pub struct Database {
    table: HashMap<String, String>,
}

impl Database {
    /// Create a database.
    pub fn new() -> Database {
        let mut table = HashMap::new();
        table.insert("version".to_string(), "1".to_string());
        Database { table }
    }

    fn get_path(key: &String) -> PathBuf {
        Path::new("data/").join(key.clone())
    }

    /// Insert a key-value pair in the database.
    #[allow(unused)]
    pub fn insert(&mut self, key: String, value: String) {
        if cfg!(feature = "persistence") {
            let path = Database::get_path(&key);
            let mut file = File::create(path).unwrap();
            file.write_all(value.as_bytes()).unwrap();
            file.sync_all();
        } else {
            self.table.insert(key, value).is_some();
        }
    }

    /// Get a value for a given key from the database.
    pub fn get(&self, key: &String) -> Option<String> {
        if cfg!(feature = "persistence") {
            let path = Database::get_path(key);
            match fs::read_to_string(path) {
                Ok(string) => Some(string),
                Err(_) => None,
            }
        } else {
            self.table.get(key).map(|v| v.clone())
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_get() {
        let database = Database::new();
        let key = "version".to_string();
        assert_eq!(database.get(&key), Some("1".to_string()));
    }
}
