// SPDX-License-Identifier: MIT

#![no_std]

use soroban_sdk::{contract, contracterror, contractimpl, contracttype, Env, Map, Vec};

pub const MAX_PAGE_SIZE: u32 = 25;

#[contracttype]
#[derive(Clone)]
pub enum DataKey {
    Values,
    Entries,
}

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum Error {
    LimitTooLarge = 1,
}

#[contract]
pub struct Pagination;

#[contractimpl]
impl Pagination {
    pub fn __constructor(env: Env) {
        env.storage()
            .persistent()
            .set(&DataKey::Values, &Vec::<i128>::new(&env));
        env.storage()
            .persistent()
            .set(&DataKey::Entries, &Map::<u32, i64>::new(&env));
    }

    pub fn set_values(env: Env, values: Vec<i128>) {
        env.storage().persistent().set(&DataKey::Values, &values);
    }

    pub fn set_entries(env: Env, entries: Map<u32, i64>) {
        env.storage().persistent().set(&DataKey::Entries, &entries);
    }

    pub fn get_values(env: Env, start: u32, limit: u32) -> Result<Vec<i128>, Error> {
        let values: Vec<i128> = env
            .storage()
            .persistent()
            .get(&DataKey::Values)
            .unwrap_or_else(|| Vec::new(&env));
        let page = Self::slice_vec(&env, &values, start, limit)?;
        Ok(page)
    }

    pub fn get_entries(env: Env, start: u32, limit: u32) -> Result<Map<u32, i64>, Error> {
        let entries: Map<u32, i64> = env
            .storage()
            .persistent()
            .get(&DataKey::Entries)
            .unwrap_or_else(|| Map::new(&env));
        let page = Self::slice_map(&env, &entries, start, limit)?;
        Ok(page)
    }

    fn slice_vec(
        env: &Env,
        values: &Vec<i128>,
        start: u32,
        limit: u32,
    ) -> Result<Vec<i128>, Error> {
        if limit > MAX_PAGE_SIZE {
            return Err(Error::LimitTooLarge);
        }

        if start >= values.len() {
            return Ok(Vec::new(env));
        }

        let mut page = Vec::new(env);
        for value in values.iter().skip(start as usize).take(limit as usize) {
            page.push_back(value);
        }
        Ok(page)
    }

    fn slice_map(
        env: &Env,
        entries: &Map<u32, i64>,
        start: u32,
        limit: u32,
    ) -> Result<Map<u32, i64>, Error> {
        if limit > MAX_PAGE_SIZE {
            return Err(Error::LimitTooLarge);
        }

        if start >= entries.len() {
            return Ok(Map::new(env));
        }

        let mut page = Map::new(env);
        for (key, value) in entries.iter().skip(start as usize).take(limit as usize) {
            page.set(key, value);
        }
        Ok(page)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use soroban_sdk::{map, vec};

    fn setup() -> (Env, PaginationClient<'static>) {
        let env = Env::default();
        let contract_id = env.register(Pagination, ());
        let client = PaginationClient::new(&env, &contract_id);
        (env, client)
    }

    #[test]
    fn test_vec_pagination_returns_expected_slice() {
        let (env, client) = setup();
        let values = vec![&env, 10, 20, 30, 40, 50, 60, 70, 80];
        client.set_values(&values);

        let page = client.get_values(&2, &4);

        assert_eq!(page, vec![&env, 30, 40, 50, 60]);
    }

    #[test]
    fn test_vec_pagination_rejects_limit_over_max() {
        let (env, client) = setup();
        let values = vec![&env, 10, 20, 30];
        client.set_values(&values);

        let result = client.try_get_values(&0, &(MAX_PAGE_SIZE + 1));

        assert_eq!(result, Err(Ok(Error::LimitTooLarge)));
    }

    #[test]
    fn test_vec_pagination_start_past_end_returns_empty() {
        let (env, client) = setup();
        let values = vec![&env, 10, 20, 30];
        client.set_values(&values);

        let page = client.get_values(&10, &5);

        assert!(page.is_empty());
    }

    #[test]
    fn test_map_pagination_returns_expected_slice() {
        let (env, client) = setup();
        let entries = map![
            &env,
            (1u32, 10i64),
            (2u32, 20i64),
            (3u32, 30i64),
            (4u32, 40i64),
            (5u32, 50i64)
        ];
        client.set_entries(&entries);

        let page = client.get_entries(&1, &3);

        assert_eq!(
            page,
            map![&env, (2u32, 20i64), (3u32, 30i64), (4u32, 40i64)]
        );
    }

    #[test]
    fn test_map_pagination_rejects_limit_over_max() {
        let (env, client) = setup();
        let entries = map![&env, (1u32, 10i64), (2u32, 20i64)];
        client.set_entries(&entries);

        let result = client.try_get_entries(&0, &(MAX_PAGE_SIZE + 1));

        assert_eq!(result, Err(Ok(Error::LimitTooLarge)));
    }

    #[test]
    fn test_map_pagination_start_past_end_returns_empty() {
        let (env, client) = setup();
        let entries = map![&env, (1u32, 10i64), (2u32, 20i64), (3u32, 30i64)];
        client.set_entries(&entries);

        let page = client.get_entries(&10, &5);

        assert_eq!(page.len(), 0);
    }

    /// Regression: when the total entry count is not divisible by the page size,
    /// iterating all pages must yield every entry exactly once — no entry is
    /// skipped and no entry is returned twice.
    ///
    /// Setup: 7 entries, page size 3 → pages at start=0, 3, 6.
    /// Expected sizes: 3, 3, 1.  Union of all pages == original map.
    #[test]
    fn test_get_entries_non_divisible_page_size_no_skip_or_repeat() {
        let (env, client) = setup();
        // 7 entries: keys 1..=7, values 10..=70
        let entries = map![
            &env,
            (1u32, 10i64),
            (2u32, 20i64),
            (3u32, 30i64),
            (4u32, 40i64),
            (5u32, 50i64),
            (6u32, 60i64),
            (7u32, 70i64)
        ];
        client.set_entries(&entries);

        let page_size: u32 = 3;
        let total: u32 = entries.len();

        // Collect every (key, value) pair across all pages.
        let mut collected: Map<u32, i64> = Map::new(&env);
        let mut start: u32 = 0;
        loop {
            let page = client.get_entries(&start, &page_size);
            if page.is_empty() {
                break;
            }
            for (k, v) in page.iter() {
                // Each key must appear at most once across all pages.
                assert!(
                    !collected.contains_key(k),
                    "key {k} appeared more than once across pages"
                );
                collected.set(k, v);
            }
            start += page_size;
        }

        // Every entry in the original map must have been visited.
        assert_eq!(
            collected.len(),
            total,
            "expected {total} unique entries after full pagination, got {}",
            collected.len()
        );
        for (k, v) in entries.iter() {
            assert_eq!(
                collected.get(k),
                Some(v),
                "entry with key {k} was missing from paginated results"
            );
        }
    }

    /// The last page of `get_entries` must return only the remaining entries
    /// and must not duplicate any entry from the preceding page.
    ///
    /// Setup: 5 entries, page size 3.
    /// Page 0 (start=0, limit=3) → 3 entries.
    /// Page 1 (start=3, limit=3) → exactly 2 entries (the remainder).
    /// No key from page 0 should appear in page 1.
    #[test]
    fn test_get_entries_last_page_is_partial_and_contains_no_duplicates() {
        let (env, client) = setup();
        let entries = map![
            &env,
            (10u32, 100i64),
            (20u32, 200i64),
            (30u32, 300i64),
            (40u32, 400i64),
            (50u32, 500i64)
        ];
        client.set_entries(&entries);

        let page_size: u32 = 3;

        let first_page = client.get_entries(&0, &page_size);
        assert_eq!(first_page.len(), 3, "first page should have 3 entries");

        let last_page = client.get_entries(&page_size, &page_size);
        assert_eq!(
            last_page.len(),
            2,
            "last page should have only the 2 remaining entries, not {}: no duplication allowed",
            last_page.len()
        );

        // Ensure no key from the first page leaks into the last page.
        for (k, _) in first_page.iter() {
            assert!(
                !last_page.contains_key(k),
                "key {k} appears in both first and last page — duplication detected"
            );
        }

        // Together both pages must cover all 5 entries.
        let total_seen = first_page.len() + last_page.len();
        assert_eq!(
            total_seen, 5,
            "first + last page should cover all 5 entries, got {total_seen}"
        );
    }

    /// `get_entries` must return a contract error (not an unwrap panic) when
    /// the requested limit exceeds MAX_PAGE_SIZE.  This pins the failure path
    /// so that a refactor replacing `Err(Error::LimitTooLarge)` with `unwrap`
    /// would cause this test to fail.
    #[test]
    fn test_get_entries_over_limit_returns_contract_error_not_panic() {
        let (env, client) = setup();
        let entries = map![&env, (1u32, 10i64)];
        client.set_entries(&entries);

        let result = client.try_get_entries(&0, &(MAX_PAGE_SIZE + 1));

        // Must be a contract error, not a host panic.
        assert_eq!(
            result,
            Err(Ok(Error::LimitTooLarge)),
            "expected Err(Ok(Error::LimitTooLarge)) but got {result:?}"
        );
    }
}
