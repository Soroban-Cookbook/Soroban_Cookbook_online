#![no_std]

use soroban_sdk::{
    contract, contractimpl, contracttype, symbol_short, Address, BytesN, Env, IntoVal, Symbol,
    Vec,
};

#[contracttype]
#[derive(Clone)]
enum DataKey {
    Deployed,
    DeployCounter,
    ChildWasmHash,
}

/// Factory contract that deploys multiple child contract instances.
#[contract]
pub struct ContractFactory;

#[contractimpl]
impl ContractFactory {
    /// Store the uploaded child contract Wasm hash used for deployments.
    pub fn initialize(env: Env, child_wasm_hash: BytesN<32>) {
        if env.storage().persistent().has(&DataKey::ChildWasmHash) {
            panic!("already initialized");
        }
        env.storage()
            .persistent()
            .set(&DataKey::ChildWasmHash, &child_wasm_hash);
        env.storage()
            .persistent()
            .set(&DataKey::Deployed, &Vec::<Address>::new(&env));
        env.storage()
            .persistent()
            .set(&DataKey::DeployCounter, &0_u64);
    }

    /// Deploy a new child contract instance.
    pub fn deploy_child(env: Env, name: Symbol) -> Address {
        let wasm_hash: BytesN<32> = env
            .storage()
            .persistent()
            .get(&DataKey::ChildWasmHash)
            .expect("factory not initialized");

        let salt_index: u64 = env
            .storage()
            .persistent()
            .get(&DataKey::DeployCounter)
            .unwrap_or(0);
        env.storage()
            .persistent()
            .set(&DataKey::DeployCounter, &(salt_index + 1));

        let mut salt_bytes = [0u8; 32];
        salt_bytes[..8].copy_from_slice(&salt_index.to_le_bytes());
        let salt = BytesN::from_array(&env, &salt_bytes);

        let child_address = env
            .deployer()
            .with_current_contract(salt)
            .deploy_v2(wasm_hash, ());

        let _: () = env.invoke_contract(
            &child_address,
            &symbol_short!("init"),
            soroban_sdk::vec![&env, name.into_val(&env)],
        );

        let mut deployed: Vec<Address> = env
            .storage()
            .persistent()
            .get(&DataKey::Deployed)
            .unwrap_or_else(|| Vec::<Address>::new(&env));

        deployed.push_back(child_address.clone());
        env.storage()
            .persistent()
            .set(&DataKey::Deployed, &deployed);

        child_address
    }

    /// Get the list of all deployed child contracts.
    pub fn get_deployed_children(env: Env) -> Vec<Address> {
        env.storage()
            .persistent()
            .get(&DataKey::Deployed)
            .unwrap_or_else(|| Vec::<Address>::new(&env))
    }

    /// Get the count of deployed child contracts.
    pub fn child_count(env: Env) -> u32 {
        let deployed: Vec<Address> = env
            .storage()
            .persistent()
            .get(&DataKey::Deployed)
            .unwrap_or_else(|| Vec::<Address>::new(&env));
        deployed.len() as u32
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use soroban_sdk::Env;

    mod child_wasm {
        soroban_sdk::contractimport!(
            file = "child/target/wasm32-unknown-unknown/release/contract_factory_child.wasm"
        );
    }

    fn setup_factory(env: &Env) -> (Address, ContractFactoryClient<'static>) {
        env.mock_all_auths();
        let wasm_hash = env
            .deployer()
            .upload_contract_wasm(child_wasm::WASM);
        let factory_id = env.register(ContractFactory, ());
        let factory = ContractFactoryClient::new(env, &factory_id);
        factory.initialize(&wasm_hash);
        (factory_id, factory)
    }

    #[test]
    fn test_factory_deploy_child() {
        let env = Env::default();
        let (factory_id, factory) = setup_factory(&env);

        let name1 = Symbol::new(&env, "child1");
        let child1_address = factory.deploy_child(&name1);
        assert_ne!(child1_address, factory_id);
        assert_eq!(factory.child_count(), 1);
    }

    #[test]
    fn test_factory_deploy_multiple_children() {
        let env = Env::default();
        let (_, factory) = setup_factory(&env);

        let child1_address = factory.deploy_child(&Symbol::new(&env, "child1"));
        let child2_address = factory.deploy_child(&Symbol::new(&env, "child2"));
        let child3_address = factory.deploy_child(&Symbol::new(&env, "child3"));

        assert_eq!(factory.child_count(), 3);

        let deployed = factory.get_deployed_children();
        assert_eq!(deployed.len(), 3);
        assert!(deployed.contains(&child1_address));
        assert!(deployed.contains(&child2_address));
        assert!(deployed.contains(&child3_address));
    }

    #[test]
    fn test_factory_children_are_unique() {
        let env = Env::default();
        let (_, factory) = setup_factory(&env);

        let child1 = factory.deploy_child(&Symbol::new(&env, "alice"));
        let child2 = factory.deploy_child(&Symbol::new(&env, "bob"));
        assert_ne!(child1, child2);
    }

    #[test]
    fn test_factory_child_count_increments() {
        let env = Env::default();
        let (_, factory) = setup_factory(&env);

        assert_eq!(factory.child_count(), 0);

        factory.deploy_child(&Symbol::new(&env, "child1"));
        assert_eq!(factory.child_count(), 1);

        factory.deploy_child(&Symbol::new(&env, "child2"));
        assert_eq!(factory.child_count(), 2);

        factory.deploy_child(&Symbol::new(&env, "child3"));
        assert_eq!(factory.child_count(), 3);
    }
}
