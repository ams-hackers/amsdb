use std::collections::hash_map::Entry;
use std::collections::HashMap;
use std::fs;
use std::io::{self, Read, Seek, Write};

pub const PAGE_SIZE: usize = 4096;

type Page = [u8; PAGE_SIZE];
type PageIndex = u64;
type PagerError = io::Error;

pub struct Pager {
    file: fs::File,
    page_cache: HashMap<PageIndex, Page>,
}

impl Pager {
    pub fn new(filename: &str, truncate: bool) -> io::Result<Pager> {
        if truncate {
            fs::remove_file(filename)?;
        }
        let file = fs::OpenOptions::new()
            .read(true)
            .write(true)
            .create(true)
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

    pub fn sync(&self) {
        self.file.sync_all().expect("Unable to sync");
    }

    pub fn get_byte_count(&self) -> u64 {
        self.file.metadata().expect("Can not open the metadata for data file").len()
    }

    pub fn get_next_page_index(&self) -> PageIndex {
        self.get_byte_count() / PAGE_SIZE as u64
    }
}

#[cfg(test)]
mod test {
    use super::*;

    #[test]
    fn test_single_page_write() {
        let mut pager = Pager::new("data.bin", true).expect("create pager");
        let new_page = [42u8; PAGE_SIZE];
        let index = pager.append_page(&new_page).expect("append page");
        pager.sync();
        assert_eq!(index, 0);
        let the_page = pager.read_page(0);
        assert_eq!(the_page[0], 42u8);
    }
}
