//! Example crate demonstrating #[contracttype] enums, structs, and storage round‑trip.

use soroban_sdk::{contracttype, Env, Address, Symbol, Bytes, vec, Vec, Symbol, EnvVal, Storage, Panic};

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum MyEnum {
    VariantA,
    VariantB(u32),
    VariantC { name: Symbol, amount: i128 },
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct MyStruct {
    pub id: u32,
    pub owner: Address,
    pub value: i128,
    pub flag: bool,
    pub enum_field: MyEnum,
}

/// Storage keys for the contract.
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum DataKey {
    MyStruct(u32),
    MyEnum(u32),
}

/// Write a `MyStruct` to storage.
pub fn put_struct(env: &Env, key: u32, s: MyStruct) {
    env.storage().persistent().set(&DataKey::MyStruct(key), &s);
}

/// Read a `MyStruct` from storage.
pub fn get_struct(env: &Env, key: u32) -> MyStruct {
    env.storage().persistent().get(&DataKey::MyStruct(key)).unwrap()
}

/// Write a `MyEnum` to storage.
pub fn put_enum(env: &Env, key: u32, e: MyEnum) {
    env.storage().persistent().set(&DataKey::MyEnum(key), &e);
}

/// Read a `MyEnum` from storage.
pub fn get_enum(env: &Env, key: u32) -> MyEnum {
    env.storage().persistent().get(&DataKey::MyEnum(key)).unwrap()
}

/// Function that deliberately panics when trying to read the wrong type.
pub fn panic_on_bad_type(env: &Env, key: u32) {
    // Attempt to read a MyStruct as a MyEnum – this will panic.
    let _bad: MyEnum = env.storage().persistent().get(&DataKey::MyStruct(key)).unwrap();
    // The line above should panic because the stored type does not match.
}
