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
        env.storage().persistent().set(&DataKey::Values, &Vec::<i128>::new(&env));
        env.storage().persistent().set(&DataKey::Entries, &Map::<u32, i64>::new(&env));
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

    fn slice_vec(env: &Env, values: &Vec<i128>, start: u32, limit: u32) -> Result<Vec<i128>, Error> {
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

    fn slice_map(env: &Env, entries: &Map<u32, i64>, start: u32, limit: u32) -> Result<Map<u32, i64>, Error> {
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
        let entries = map![&env, (1u32, 10i64), (2u32, 20i64), (3u32, 30i64), (4u32, 40i64), (5u32, 50i64)];
        client.set_entries(&entries);

        let page = client.get_entries(&1, &3);

        assert_eq!(page, map![&env, (2u32, 20i64), (3u32, 30i64), (4u32, 40i64)]);
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
}
