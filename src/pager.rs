use std::collections::hash_map::Entry;
use std::collections::HashMap;
use std::fs;
use std::io::{self, Read, Seek, Write};

const PAGE_SIZE: usize = 4096;

type Page = [u8; PAGE_SIZE];
type PageIndex = u64;
type PagerError = io::Error;

pub struct Pager {
    file: fs::File,
    page_cache: HashMap<PageIndex, Page>,
}

impl Pager {
    pub fn new(filename: &str, truncate: bool) -> io::Result<Pager> {
        let file = fs::OpenOptions::new()
            .read(true)
            .write(true)
            .create(true)
            .truncate(truncate)
            .append(true)
            .open(filename)?;
        let page_cache: HashMap<PageIndex, Page> = HashMap::new();
        Ok(Pager { file, page_cache })
    }

    pub fn append_page(&mut self, page: &Page) -> Result<PageIndex, PagerError> {
        let page_index = self.get_next_page_index();
        self.file.write_all(page)?;
        Ok(page_index)
    }

    pub fn read_page(&mut self, index: PageIndex) -> &Page {
        match self.page_cache.entry(index) {
            Entry::Occupied(e) => e.into_mut(),
            Entry::Vacant(e) => {
                self.file
                    .seek(io::SeekFrom::Start(index * PAGE_SIZE as u64))
                    .expect("Can't seek to index");

                let mut page: Page = [0; PAGE_SIZE];
                self.file.read_exact(&mut page).expect("Can't read page");

                e.insert(page)
            }
        }
    }

    pub fn get_next_page_index(&self) -> PageIndex {
        todo!()
    }
}

#[cfg(test)]
mod test {
    use super::*;

    #[test]
    fn test_all() {
        let _pager = Pager::new("data.bin", true);
    }
}
