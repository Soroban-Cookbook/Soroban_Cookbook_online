#![no_std]
use soroban_sdk::{contract, contractimpl, Env, String};

#[contract]
pub struct HelloWorld;

#[contractimpl]
impl HelloWorld {
    /// Return a greeting stored in instance storage, or a default greeting.
    pub fn hello(env: Env) -> String {
        env.storage()
            .instance()
            .get(&"msg")
            .unwrap_or(String::from_str(&env, "Hello, Soroban!"))
    }

    /// Store a custom greeting message.
    pub fn set_message(env: Env, message: String) {
        env.storage().instance().set(&"msg", &message);
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use soroban_sdk::Env;

    #[test]
    fn test_default_greeting() {
        let env = Env::default();
        let contract_id = env.register(HelloWorld, ());
        let client = HelloWorldClient::new(&env, &contract_id);

        assert_eq!(
            client.hello(),
            String::from_str(&env, "Hello, Soroban!")
        );
    }

    #[test]
    fn test_custom_greeting() {
        let env = Env::default();
        let contract_id = env.register(HelloWorld, ());
        let client = HelloWorldClient::new(&env, &contract_id);

        client.set_message(&String::from_str(&env, "Greetings from Soroban!"));
        assert_eq!(
            client.hello(),
            String::from_str(&env, "Greetings from Soroban!")
        );
    }
}
