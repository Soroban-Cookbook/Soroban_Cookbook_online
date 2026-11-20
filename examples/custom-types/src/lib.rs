// SPDX-License-Identifier: MIT

//! Example crate demonstrating `#[contracttype`] enums, structs, and storage
//! round-trips — how to model rich domain data and persist it in contract
//! storage without losing type information.

#![no_std]

use soroban_sdk::{
    contract, contracterror, contractimpl, contracttype, Address, Env, Symbol, TryFromVal, Val,
};

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum MyEnum {
    VariantA,
    VariantB(u32),
    VariantC(Symbol, i128),
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

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum Error {
    /// No value is stored at the requested key.
    MissingValue = 1,
    /// A value is stored at the key, but it is not the requested type.
    TypeMismatch = 2,
}

#[contract]
pub struct CustomTypes;

#[contractimpl]
impl CustomTypes {
    /// Write a `MyStruct` to storage.
    pub fn put_struct(env: Env, key: u32, s: MyStruct) {
        env.storage().persistent().set(&DataKey::MyStruct(key), &s);
    }

    /// Read a `MyStruct` from storage.
    pub fn get_struct(env: Env, key: u32) -> Result<MyStruct, Error> {
        env.storage()
            .persistent()
            .get(&DataKey::MyStruct(key))
            .ok_or(Error::MissingValue)
    }

    /// Write a `MyEnum` to storage.
    pub fn put_enum(env: Env, key: u32, e: MyEnum) {
        env.storage().persistent().set(&DataKey::MyEnum(key), &e);
    }

    /// Read a `MyEnum` from storage.
    pub fn get_enum(env: Env, key: u32) -> Result<MyEnum, Error> {
        env.storage()
            .persistent()
            .get(&DataKey::MyEnum(key))
            .ok_or(Error::MissingValue)
    }

    /// Read a slot that was written as a `MyStruct` back as a `MyEnum`.
    ///
    /// The stored value is fetched as a raw [`Val`] and converted explicitly,
    /// so a type mismatch surfaces as the contract error
    /// [`Error::TypeMismatch`] instead of panicking inside the storage getter.
    pub fn panic_on_bad_type(env: Env, key: u32) -> Result<(), Error> {
        let raw: Val = env
            .storage()
            .persistent()
            .get(&DataKey::MyStruct(key))
            .ok_or(Error::MissingValue)?;
        MyEnum::try_from_val(&env, &raw).map_err(|_| Error::TypeMismatch)?;
        Ok(())
    }
}
