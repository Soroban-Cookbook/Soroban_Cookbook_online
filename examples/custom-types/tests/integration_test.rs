// SPDX-License-Identifier: MIT

// Integration tests for the custom-types example crate. They drive the
// contract entry points (`put_struct`, `get_struct`, `put_enum`,
// `panic_on_bad_type`) through the generated client.

use custom_types::{CustomTypesClient, Error, MyEnum, MyStruct};
use soroban_sdk::{symbol_short, testutils::Address as _, Address, Env};

#[test]
fn test_struct_roundtrip() {
    let env = Env::default();
    let contract_id = env.register(custom_types::CustomTypes, ());
    let client = CustomTypesClient::new(&env, &contract_id);
    let key = 1u32;
    let obj = MyStruct {
        id: key,
        owner: Address::generate(&env),
        value: 12345i128,
        flag: true,
        enum_field: MyEnum::VariantB(42),
    };
    client.put_struct(&key, &obj.clone());
    assert_eq!(client.get_struct(&key), obj);
}

#[test]
fn test_enum_roundtrip() {
    let env = Env::default();
    let contract_id = env.register(custom_types::CustomTypes, ());
    let client = CustomTypesClient::new(&env, &contract_id);
    let key = 2u32;
    let enum_obj = MyEnum::VariantC(symbol_short!("test"), 99i128);
    client.put_enum(&key, &enum_obj.clone());
    assert_eq!(client.get_enum(&key), enum_obj);
}

#[test]
fn test_panic_on_bad_type_returns_contract_error() {
    let env = Env::default();
    let contract_id = env.register(custom_types::CustomTypes, ());
    let client = CustomTypesClient::new(&env, &contract_id);
    let key = 3u32;
    let struct_obj = MyStruct {
        id: key,
        owner: Address::generate(&env),
        value: 0,
        flag: false,
        enum_field: MyEnum::VariantA,
    };
    // The slot is written as a MyStruct, so reading it back as a MyEnum must
    // surface the contract error TypeMismatch rather than panicking.
    client.put_struct(&key, &struct_obj);
    assert_eq!(
        client.try_panic_on_bad_type(&key),
        Err(Ok(Error::TypeMismatch))
    );
}
