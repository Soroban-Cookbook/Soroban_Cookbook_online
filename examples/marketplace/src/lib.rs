//! # Marketplace Example
//!
//! A minimal marketplace for NFTs (or any asset) that supports listing, buying, and cancelling.
//!
//! The contract stores listings identified by a `listing_id`. Each listing records the seller,
//! the token contract used for payment, the price, and the state. Buyers can purchase a listing
//! by paying the price in the specified token. Sellers can cancel their own listings.
//!
//! This implementation is deliberately simple and does not handle NFT transfer logic – it
//! assumes the NFT is represented by an external contract address and token ID that the
//! seller will transfer off‑chain after a successful purchase.
//!
//! ## Storage Layout
//! | Key                | Type            | Description                                            |
//! |--------------------|-----------------|--------------------------------------------------------|
//! | `NextId`           | `u64`           | Auto‑incrementing ID for the next listing.             |
//! | `Listing_<id>`     | `Listing`       | Information about a specific listing.                  |
//!
//! ## Errors
//! * `NotFound` – listing does not exist.
//! * `Unauthorized` – caller is not permitted to perform the action.
//! * `AlreadyClosed` – listing is already sold or cancelled.
//! * `InsufficientFunds` – buyer does not have enough balance.
//!
//! ## Usage
//! 1. **List** – Seller creates a listing with a price.
//! 2. **Buy** – Buyer purchases the listing, paying the price.
//! 3. **Cancel** – Seller cancels an active listing.
//!
//! The contract is compiled to WASM for deployment on Soroban.

#![no_std]

use soroban_sdk::{
    contract, contracterror, contractimpl, contracttype, symbol_short, token, Address, Env, Symbol,
    Vec, Bytes,
};

// ─── Errors ────────────────────────────────────────────────────────────────────
#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum Error {
    NotFound = 1,
    Unauthorized = 2,
    AlreadyClosed = 3,
    InsufficientFunds = 4,
    InvalidPrice = 5,
}

// ─── Storage Keys ───────────────────────────────────────────────────────────────
#[contracttype]
#[derive(Clone)]
pub enum DataKey {
    NextId,
    Listing(u64),
}

// ─── Listing State ───────────────────────────────────────────────────────────
#[contracttype]
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum ListingState {
    Active,
    Sold,
    Cancelled,
}

// ─── Listing Struct ────────────────────────────────────────────────────────
#[contracttype]
#[derive(Clone)]
pub struct Listing {
    seller: Address,
    // Address of the token contract used for payment (e.g., SAC or custom token).
    token: Address,
    price: i128,
    // Identifier of the NFT asset (could be an address, token id, etc.).
    nft_id: Bytes,
    state: ListingState,
}

// ─── Contract ────────────────────────────────────────────────────────────────
#[contract]
pub struct Marketplace;

#[contractimpl]
impl Marketplace {
    /// Initialise the next listing id. Should be called once after deployment.
    pub fn init(env: Env) {
        env.storage().persistent().set(&DataKey::NextId, &0u64);
    }

    /// Create a new listing.
    ///
    /// * `seller` – the address offering the NFT.
    /// * `token` – the token contract used for payment.
    /// * `price` – amount to be paid (in token's smallest unit).
    /// * `nft_id` – identifier of the NFT (opaque bytes).
    pub fn list(env: Env, seller: Address, token: Address, price: i128, nft_id: Bytes) -> u64 {
        seller.require_auth();
        if price <= 0 {
            panic!(Error::InvalidPrice);
        }
        let id: u64 = env.storage().persistent().get(&DataKey::NextId).unwrap_or(0);
        let next = id + 1;
        env.storage().persistent().set(&DataKey::NextId, &next);
        let listing = Listing {
            seller: seller.clone(),
            token,
            price,
            nft_id,
            state: ListingState::Active,
        };
        env.storage()
            .persistent()
            .set(&DataKey::Listing(id), &listing);
        env.events().publish(
            (symbol_short!("list"),),
            (seller, id, price),
        );
        id
    }

    /// Purchase an active listing.
    ///
    /// * `buyer` – the address buying the NFT.
    /// * `listing_id` – identifier of the listing.
    pub fn buy(env: Env, buyer: Address, listing_id: u64) {
        buyer.require_auth();
        let maybe_listing: Option<Listing> = env
            .storage()
            .persistent()
            .get(&DataKey::Listing(listing_id));
        let mut listing = maybe_listing.ok_or_else(|| panic!(Error::NotFound)).unwrap();
        if listing.state != ListingState::Active {
            panic!(Error::AlreadyClosed);
        }
        if buyer == listing.seller {
            panic!(Error::Unauthorized);
        }
        // Transfer payment from buyer to seller.
        let token_client = token::Client::new(&env, &listing.token);
        // Attempt the transfer; any failure will revert.
        token_client.transfer(&buyer, &listing.seller, &listing.price);
        // Mark as sold.
        listing.state = ListingState::Sold;
        env.storage()
            .persistent()
            .set(&DataKey::Listing(listing_id), &listing);
        env.events().publish(
            (symbol_short!("buy"),),
            (buyer, listing_id, listing.price),
        );
    }

    /// Cancel an active listing. Only the seller may cancel.
    pub fn cancel(env: Env, seller: Address, listing_id: u64) {
        seller.require_auth();
        let maybe_listing: Option<Listing> = env
            .storage()
            .persistent()
            .get(&DataKey::Listing(listing_id));
        let mut listing = maybe_listing.ok_or_else(|| panic!(Error::NotFound)).unwrap();
        if listing.state != ListingState::Active {
            panic!(Error::AlreadyClosed);
        }
        if seller != listing.seller {
            panic!(Error::Unauthorized);
        }
        listing.state = ListingState::Cancelled;
        env.storage()
            .persistent()
            .set(&DataKey::Listing(listing_id), &listing);
        env.events().publish(
            (symbol_short!("cancel"),),
            (seller, listing_id),
        );
    }

    /// Retrieve a listing (for read‑only callers).
    pub fn get_listing(env: Env, listing_id: u64) -> Option<Listing> {
        env.storage().persistent().get(&DataKey::Listing(listing_id))
    }
}
