// Integration tests for the custom-types example crate.

#[cfg(test)]
mod tests {
    use super::*;
    use soroban_sdk::{Env, testutils::Address as _, Symbol, Bytes};

    #[test]
    fn test_struct_roundtrip() {
        let env = Env::default();
        let key = 1u32;
        let obj = MyStruct {
            id: key,
            owner: Address::generate(&env),
            value: 12345i128,
            flag: true,
            enum_field: MyEnum::VariantB(42),
        };
        put_struct(&env, key, obj.clone());
        let retrieved = get_struct(&env, key);
        assert_eq!(obj, retrieved);
    }

    #[test]
    fn test_enum_roundtrip() {
        let env = Env::default();
        let key = 2u32;
        let enum_obj = MyEnum::VariantC { name: Symbol::short("test"), amount: 99i128 };
        put_enum(&env, key, enum_obj.clone());
        let retrieved = get_enum(&env, key);
        assert_eq!(enum_obj, retrieved);
    }

    #[test]
    #[should_panic]
    fn test_invalid_conversion_panic() {
        let env = Env::default();
        let key = 3u32;
        let struct_obj = MyStruct {
            id: key,
            owner: Address::generate(&env),
            value: 0,
            flag: false,
            enum_field: MyEnum::VariantA,
        };
        // Store as struct
        put_struct(&env, key, struct_obj);
        // This should panic because we try to read as MyEnum
        panic_on_bad_type(&env, key);
    }
}
