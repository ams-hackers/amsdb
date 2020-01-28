use amsdb::backend_file::Database;
use amsdb::Pager;
use criterion::{criterion_group, criterion_main, Criterion};

fn criterion_benchmark(c: &mut Criterion) {
    c.bench_function("backend_file.insert", |b| {
        let mut database = Database::new();

        b.iter(|| {
            database.insert("foo".to_string(), "bar".to_string());
        })
    });

    c.bench_function("pager.append", |b| {
        let mut pager = Pager::new("data.bin", true).expect("can not create pager");
        b.iter(|| {
            for i in 0..255 {
                let new_page = [i; amsdb::PAGE_SIZE];
                let _index = pager.append_page(&new_page).expect("append page");
            }
            pager.sync();
        })
    });
}

criterion_group!(benches, criterion_benchmark);
criterion_main!(benches);
