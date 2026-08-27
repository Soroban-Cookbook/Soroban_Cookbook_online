#![no_std]

//! # Cross-Contract Invocation Example
//! 
//! This example demonstrates safe cross-contract invocation patterns including:
//! - Using typed clients for external contract calls
//! - Error handling with try_* methods
//! - Reentrancy protection patterns
//! - Proper authorization flow

pub mod token;
pub mod vault;

#[cfg(test)]
mod test;

pub use token::{Token, TokenClient};
pub use vault::{Vault, VaultClient};