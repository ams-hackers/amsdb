use amsdb::Database;

fn main() {
    let mut db = Database::new();
    db.put("foo".to_string(), "bar".to_string());
    match db.get("foo") {
        Some(x) => println!("Found: {}", x),
        None => println!("Nope"),
    }
}
