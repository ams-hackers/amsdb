use std::collections::hash_map::Entry;
use std::collections::HashMap;
use std::convert::TryInto;
use std::fs;
use std::io::ErrorKind;
use std::io::{self, Read, Seek, Write};

pub const PAGE_SIZE: u32 = 4096;

pub type Page = [u8; PAGE_SIZE as usize];
pub type PageIndex = u64;
type PagerError = io::Error;

/// A Pager manages a set of pages from a file.
///
/// Pages are a fixed-size block of bytes. Each page can be identified
/// and read from the file by its index in the file with `read_page`.
///
/// New pages can be appended to the file with `append_page`.
///
pub struct Pager {
    file: fs::File,
    file_size: u64,
    page_cache: HashMap<PageIndex, Page>,
}

impl Pager {
    /// Create a new pager for a given file.
    ///
    /// If `truncate` is true, the file will recreated. It is used
    /// mostly during test execution.
    pub fn new(filename: &str, truncate: bool) -> io::Result<Pager> {
        if truncate {
            remove_file_if_exists(filename)?;
        }
        let mut file = fs::OpenOptions::new()
            .read(true)
            .write(true)
            .create(true)
            .append(true)
            .open(filename)?;
        let file_size = file
            .metadata()
            .expect("Can not open the metadata for data file")
            .len();

        // If the file size is not multiple of the page size, we'll
        // write some zero bytes to make it so, to ensure we only
        // write pages at the right boundaries.
        let partial_written_page_bytes: u32 = (file_size % PAGE_SIZE as u64).try_into().unwrap();
        if partial_written_page_bytes > 0 {
            let page = [0; PAGE_SIZE as usize];
            println!(
                "Partial page detected ({} / {} bytes). Padding until the next page boundary.",
                partial_written_page_bytes, PAGE_SIZE
            );
            file.write_all(&page[(partial_written_page_bytes as usize)..])?;
            file.sync_all()?;
        }

        let page_cache: HashMap<PageIndex, Page> = HashMap::new();
        Ok(Pager {
            file,
            file_size,
            page_cache,
        })
    }

    /// Append a page to a new file returning the page index, if successful.
    pub fn append_page(&mut self, page: &Page) -> Result<PageIndex, PagerError> {
        let page_index = self.get_next_page_index();
        self.file.write_all(page)?;
        self.file_size += PAGE_SIZE as u64;
        Ok(page_index)
    }

    /// Read a page by the given PageIndex.
    pub fn read_page(&mut self, index: PageIndex) -> &Page {
        match self.page_cache.entry(index) {
            Entry::Occupied(e) => e.into_mut(),
            Entry::Vacant(e) => {
                self.file
                    .seek(io::SeekFrom::Start(index * PAGE_SIZE as u64))
                    .expect("Can't seek to index");

                let mut page: Page = [0; PAGE_SIZE as usize];
                self.file.read_exact(&mut page).expect("Can't read page");

                e.insert(page)
            }
        }
    }

    /// Flush all pages ensuring they are written to disk.
    ///
    /// If this function returns, we can assume that the data is
    /// durabily stored in disk and will remain there even after a
    /// crash of the database.
    ///
    pub fn sync(&self) {
        self.file.sync_all().expect("Unable to sync");
    }

    /// Return the page index of the next page that will be written
    /// with `append_page`.
    fn get_next_page_index(&self) -> PageIndex {
        self.file_size / PAGE_SIZE as u64
    }
}

fn remove_file_if_exists(filename: &str) -> io::Result<()> {
    fs::remove_file(filename).or_else(|err| {
        if err.kind() == ErrorKind::NotFound {
            Ok(())
        } else {
            Err(err)
        }
    })
}

#[cfg(test)]
mod test {
    use super::*;
    use std::fs;
    use std::io::prelude::*;

    #[test]
    fn test_single_page_write() {
        let mut pager = Pager::new("data.bin", true).expect("create pager");
        let new_page = [42u8; PAGE_SIZE as usize];
        let index = pager.append_page(&new_page).expect("append page");
        pager.sync();
        assert_eq!(index, 0);
        let the_page = pager.read_page(0);
        assert_eq!(the_page[0], 42u8);
    }

    #[test]
    fn test_partial_page_recovery() {
        // After opening a file with the pager, the file size should
        // always being a multiple of a page.

        let testfile = "/tmp/amsdb-partial-write.bin";
        let mut file = fs::File::create(testfile).unwrap();
        file.write_all(b"foobar").unwrap();
        {
            Pager::new(testfile, false).expect("create pager");
        }
        assert!(fs::metadata(testfile).unwrap().len() % PAGE_SIZE as u64 == 0);
    }
}
