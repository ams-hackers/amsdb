use amsdb::backend_file::Database;
use criterion::{criterion_group, criterion_main, Criterion};

fn criterion_benchmark(c: &mut Criterion) {
    let mut database = Database::new();

    c.bench_function("database.insert", |b| {
        b.iter(|| {
            database.insert("foo".to_string(), "bar".to_string());
        })
    });
}

criterion_group!(benches, criterion_benchmark);
criterion_main!(benches);
