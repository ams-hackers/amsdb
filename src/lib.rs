use std::collections::HashMap;

type Key = String;
type Value = String;

pub struct Database {
    table: HashMap<Key, Value>,
}

impl Database {
    pub fn new() -> Database {
        let table: HashMap<Key, Value> = HashMap::new();
        Database { table }
    }

    pub fn get<S: AsRef<str>>(&self, key: S) -> Option<&Value> {
        self.table.get(key.as_ref())
    }

    pub fn put(&mut self, key: Key, value: Value) {
        self.table.insert(key, value);
    }
}

#[cfg(test)]
mod test {
    use super::*;

    #[test]
    fn create_empty_database() {
        Database::new();
    }

    #[test]
    fn get_missing_key() {
        let db = Database::new();
        let res = db.get("non-existing");
        assert_eq!(res, None);
    }

    #[test]
    fn put_and_get() {
        let mut db = Database::new();
        db.put("foo".to_string(), "bar".to_string());
        let res = db.get("foo");
        assert_eq!(res, Some(&"bar".to_string()));
    }
}
