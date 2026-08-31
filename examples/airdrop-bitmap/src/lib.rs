#![cfg(test)]

extern crate std;

use soroban_sdk::{
    testutils::Address as _,
    Address, Env,
};

/// A compact bitmap-based airdrop allowlist tracker.
///
/// Each bit position corresponds to a claimer's sequential index (0, 1, 2, ...).
/// A bit set to 1 means that index has already claimed the airdrop.
///
/// This is a pure-data struct for demonstration purposes - actual contract
/// integration would use Soroban's persistent storage via `env.storage()`.
#[derive(Clone, Debug)]
pub struct AirdropBitmap {
    // Bitmap stored as a bitfield in a Vec<u8>.
    // Each bit position corresponds to a claimer's sequential index.
    claims: Vec<u8>,
}

impl AirdropBitmap {
    /// Creates a new bitmap with enough bits for `max_claimers` claimers.
    pub fn new(max_claimers: u32) -> Self {
        let bytes_needed = ((max_claimers + 7) / 8) as usize;
        AirdropBitmap {
            claims: vec![0u8; bytes_needed],
        }
    }

    /// Claim an airdrop at the given bit index. Panics if already claimed.
    ///
    /// # Parameters
    /// - `claimer_index`: The sequential index of this claimer (0, 1, 2, ...)
    pub fn claim(&mut self, claimer_index: u32) {
        let byte_index = claimer_index / 8;
        let bit_offset = claimer_index % 8;

        // Extend bitmap if needed
        if byte_index as usize >= self.claims.len() {
            self.claims.resize(byte_index as usize + 1, 0u8);
        }

        // Check if already claimed
        let byte = self.claims[byte_index as usize];
        if (byte & (1u8 << bit_offset)) != 0 {
            panic!("Airdrop already claimed by index {claimer_index}");
        }

        // Set the bit
        self.claims[byte_index as usize] = byte | (1u8 << bit_offset);
    }

    /// Check if the claimer at the given index has already claimed
    pub fn has_claimed(&self, claimer_index: u32) -> bool {
        let byte_index = claimer_index / 8;
        let bit_offset = claimer_index % 8;

        if byte_index as usize >= self.claims.len() {
            return false;
        }

        let byte = self.claims[byte_index as usize];
        (byte & (1u8 << bit_offset)) != 0
    }
}

#[test]
fn test_claim_basic() {
    let mut bitmap = AirdropBitmap::new(100);

    // Alice claims at index 0 - should succeed
    bitmap.claim(0);
    assert!(bitmap.has_claimed(0));

    // Bob claims at index 1 - should succeed
    bitmap.claim(1);
    assert!(bitmap.has_claimed(1));

    // Carol claims at index 2 - should succeed
    bitmap.claim(2);
    assert!(bitmap.has_claimed(2));
}

#[test]
fn test_multiple_claimants() {
    let mut bitmap = AirdropBitmap::new(50);

    // 10 addresses claim at indices 0-9
    for i in 0..10 {
        bitmap.claim(i);
    }

    // All should have claimed
    for i in 0..10 {
        assert!(bitmap.has_claimed(i));
    }
}

#[test]
fn test_double_claim_panics() {
    let mut bitmap = AirdropBitmap::new(10);

    // Alice claims at index 0
    bitmap.claim(0);

    // Second claim at same index - will panic (expected)
    bitmap.claim(0);
}