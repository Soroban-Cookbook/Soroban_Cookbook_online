// SPDX-License-Identifier: MIT

//! Merkle-proof verified airdrop claims.
//!
//! The admin commits to an allowlist by storing the **Merkle root** of the
//! sorted leaf list on-chain. A claimer supplies the leaf (their index,
//! address and amount) plus the Merkle proof (sibling hashes and sibling
//! positions) for that leaf. The contract recomputes the root from the proof;
//! if it matches the stored root, the address was genuinely on the allowlist
//! and the claim is recorded.
//!
//! Cost model: on-chain storage is O(1) — a 32-byte root plus a small claim
//! bitmap — regardless of allowlist size, and each claim costs one proof
//! verification (O(log n) hashes computed inside the contract). Reach for
//! this pattern when an allowlist is too large to store entry by entry; for
//! small allowlists the bitmap approach in `examples/airdrop-bitmap` avoids
//! the off-chain proof generation entirely.

#![no_std]

use soroban_sdk::{
    contract, contracterror, contractevent, contractimpl, contracttype, Address, Bytes, BytesN,
    Env, Map, Vec,
};

/// Storage keys for the airdrop contract.
#[contracttype]
#[derive(Clone)]
pub enum DataKey {
    /// Address that authorized `init`; can `reset` before any claim.
    Admin,
    /// Merkle root over the sorted leaf list — the on-chain commitment.
    MerkleRoot,
    /// Compact bitmap marking claimed leaf indices, one bit per allowlist
    /// entry: byte `i / 8` holds bit `i % 8`. Each entry is claimable once.
    ClaimedBits,
}

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum Error {
    /// `init` was already called; the root is immutable once set.
    AlreadyInitialized = 1,
    /// Claim (or `merkle_root`) submitted before the admin set a root.
    NotInitialized = 2,
    /// The provided proof does not hash up to the stored root.
    InvalidProof = 3,
    /// This allowlist entry (leaf index) has already been claimed.
    AlreadyClaimed = 4,
    /// Malformed proof: hash/position vector length mismatch, or a proof
    /// deeper than any possible tree.
    MalformedProof = 6,
}

/// One allowlist entry. This is hashed to form the leaf of the Merkle tree.
///
/// The domain tag in [`leaf_hash`] binds the leaf to this specific airdrop
/// scheme, so a leaf (or proof) computed for another contract cannot be
/// replayed here.
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Leaf {
    /// Allowlist position of this entry, 0-based. Claims are tracked per
    /// index so two different addresses cannot share one entry.
    pub index: u32,
    /// Address allowed to claim this entry.
    pub claimant: Address,
    /// Token amount this entry may claim.
    pub amount: i128,
}

/// Published when an allowlist entry is successfully claimed. Topic 2 carries
/// the leaf index so indexers can track spent entries without decoding data.
#[contractevent(topics = ["merkle_airdrop", "claim"], data_format = "vec")]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct ClaimEvent {
    #[topic]
    pub index: u32,
    pub claimant: Address,
    pub amount: i128,
}

#[contract]
pub struct MerkleAirdrop;

#[contractimpl]
impl MerkleAirdrop {
    /// One-time setup: commit the allowlist by storing its Merkle root.
    ///
    /// The root must be computed over the **sorted** leaf list (sorted by
    /// index) so that every offline participant derives the same tree.
    pub fn init(env: Env, admin: Address, merkle_root: BytesN<32>) -> Result<(), Error> {
        if env.storage().instance().has(&DataKey::MerkleRoot) {
            return Err(Error::AlreadyInitialized);
        }
        admin.require_auth();

        env.storage().instance().set(&DataKey::Admin, &admin);
        env.storage()
            .instance()
            .set(&DataKey::MerkleRoot, &merkle_root);
        env.storage()
            .instance()
            .set(&DataKey::ClaimedBits, &Map::<u32, u32>::new(&env));

        Ok(())
    }

    /// The committed Merkle root (the allowlist commitment).
    pub fn merkle_root(env: Env) -> Result<BytesN<32>, Error> {
        env.storage()
            .instance()
            .get(&DataKey::MerkleRoot)
            .ok_or(Error::NotInitialized)
    }

    /// Whether allowlist entry `index` has already been claimed.
    pub fn has_claimed(env: Env, index: u32) -> bool {
        let bits: Map<u32, u32> = claimed_bits(&env);
        get_bit(&bits, index)
    }

    /// Claim the airdrop for one allowlist entry.
    ///
    /// `sibling_hashes` are the sibling node hashes on the path from the
    /// leaf to the root; `sibling_is_left[i]` says whether sibling `i` is
    /// the **left** operand at that level. The contract recomputes the root
    /// and compares it to the stored commitment; on match the entry is
    /// marked claimed and a `claim` event is published.
    pub fn claim(
        env: Env,
        leaf: Leaf,
        sibling_hashes: Vec<BytesN<32>>,
        sibling_is_left: Vec<bool>,
    ) -> Result<(), Error> {
        let root: BytesN<32> = env
            .storage()
            .instance()
            .get(&DataKey::MerkleRoot)
            .ok_or(Error::NotInitialized)?;

        // Each allowlist entry may be claimed exactly once.
        if Self::has_claimed(env.clone(), leaf.index) {
            return Err(Error::AlreadyClaimed);
        }

        // The claimant must authorise the claim on behalf of their address.
        leaf.claimant.require_auth();

        // Recompute the root from the leaf and proof.
        let computed = compute_root(&env, &leaf, &sibling_hashes, &sibling_is_left)?;
        if computed != root {
            return Err(Error::InvalidProof);
        }

        mark_claimed(&env, leaf.index);

        ClaimEvent {
            index: leaf.index,
            claimant: leaf.claimant,
            amount: leaf.amount,
        }
        .publish(&env);

        Ok(())
    }

    /// Wipe the contract. Only the admin, and only while nothing is claimed.
    ///
    /// This exists so deployments with a bad allowlist root can be recovered
    /// before claims start; once claims exist the airdrop is irreversible.
    pub fn reset(env: Env) -> Result<(), Error> {
        let admin: Address = env
            .storage()
            .instance()
            .get(&DataKey::Admin)
            .ok_or(Error::NotInitialized)?;
        admin.require_auth();

        let bits: Map<u32, u32> = claimed_bits(&env);
        if has_any_claim(&bits) {
            return Err(Error::AlreadyClaimed);
        }

        env.storage().instance().remove(&DataKey::MerkleRoot);
        env.storage().instance().remove(&DataKey::ClaimedBits);
        env.storage().instance().remove(&DataKey::Admin);

        Ok(())
    }
}

// ── storage helpers ──────────────────────────────────────────────────────────

fn claimed_bits(env: &Env) -> Map<u32, u32> {
    env.storage()
        .instance()
        .get(&DataKey::ClaimedBits)
        .unwrap_or_else(|| Map::new(env))
}

/// Read bit `index` from the packed-word bitmap (`byte i / 8`, bit `i % 8`).
fn get_bit(bits: &Map<u32, u32>, index: u32) -> bool {
    let word_index = index / 32;
    let word = bits.get(word_index).unwrap_or(0);
    (word & (1u32 << (index % 32))) != 0
}

/// Set bit `index` in the packed-word bitmap and persist it.
fn mark_claimed(env: &Env, index: u32) {
    let mut bits = claimed_bits(env);
    let word_index = index / 32;
    let word = bits.get(word_index).unwrap_or(0);
    bits.set(word_index, word | (1u32 << (index % 32)));
    env.storage().instance().set(&DataKey::ClaimedBits, &bits);
}

fn has_any_claim(bits: &Map<u32, u32>) -> bool {
    for (_, word) in bits.iter() {
        if word != 0 {
            return true;
        }
    }
    false
}

// ── Merkle helpers ───────────────────────────────────────────────────────────

/// Domain separation tag: `merkle-airdrop-v1`.
const DOMAIN_TAG: &[u8] = b"merkle-airdrop-v1";

/// Hash one allowlist leaf into a 32-byte tree node.
///
/// `sha256(domain_tag ‖ index ‖ claimant_bytes ‖ amount)` — the tag plus
/// fixed-width field encoding make the leaf unambiguous, so no two different
/// leaves produce the same hash.
fn leaf_hash(env: &Env, leaf: &Leaf) -> BytesN<32> {
    // Canonical, deterministic identity bytes for the claimant: its strkey
    // encoding (base32 of type byte + payload + checksum).
    let claimant_bytes = leaf.claimant.to_string().to_bytes();

    let mut buf = Bytes::from_slice(env, DOMAIN_TAG);
    buf.extend_from_array(&leaf.index.to_be_bytes());
    buf.extend_from_array(&claimant_bytes.len().to_be_bytes());
    buf.append(&claimant_bytes);
    buf.extend_from_array(&leaf.amount.to_be_bytes());
    env.crypto().sha256(&buf).into()
}

/// Combine two sibling nodes into their parent node.
///
/// For this scheme an odd trailing node is hashed **with itself**
/// (`hash(node, node)`), the convention Bitcoin uses. The convention must be
/// fixed at deployment time because the offline operator builds the tree
/// with the same rule; either convention is safe as long as both sides agree.
fn hash_pair(env: &Env, left: &BytesN<32>, right: &BytesN<32>) -> BytesN<32> {
    let mut buf = Bytes::from_array(env, &left.to_array());
    buf.extend_from_array(&right.to_array());
    env.crypto().sha256(&buf).into()
}

/// Recompute the Merkle root from `leaf` and its proof.
///
/// At each level the current node is paired with the next sibling hash
/// (left or right per the flag) and the pair is hashed again. The proof must
/// contain exactly one sibling per tree level.
fn compute_root(
    env: &Env,
    leaf: &Leaf,
    sibling_hashes: &Vec<BytesN<32>>,
    sibling_is_left: &Vec<bool>,
) -> Result<BytesN<32>, Error> {
    if sibling_hashes.len() != sibling_is_left.len() {
        return Err(Error::MalformedProof);
    }

    // Each level halves the leaf count, so a tree over u32::MAX leaves is at
    // most 32 levels deep; anything longer cannot be a real proof.
    if sibling_hashes.len() > 32 {
        return Err(Error::MalformedProof);
    }

    let mut current: BytesN<32> = leaf_hash(env, leaf);

    for i in 0..sibling_hashes.len() {
        let sibling = sibling_hashes.get(i).ok_or(Error::MalformedProof)?;
        let parent = if sibling_is_left.get(i).ok_or(Error::MalformedProof)? {
            hash_pair(env, &sibling, &current)
        } else {
            hash_pair(env, &current, &sibling)
        };
        current = parent;
    }

    Ok(current)
}

#[cfg(test)]
mod tests {
    use super::*;
    use soroban_sdk::testutils::Address as _;

    /// A tiny offline Merkle tree over `Leaf`s, mirroring what an airdrop
    /// operator computes off-chain before `init`. Uses the same
    /// hash-with-self rule for odd trailing nodes as the contract.
    struct Tree {
        levels: Vec<Vec<BytesN<32>>>, // levels[0] = leaves, last = root
    }

    impl Tree {
        fn new(env: &Env, leaves: &Vec<Leaf>) -> Tree {
            let level0: Vec<BytesN<32>> =
                Vec::from_iter(env, leaves.iter().map(|l| leaf_hash(env, &l)));
            let mut levels = Vec::new(env);
            levels.push_back(level0);
            let mut width = leaves.len() as u32;
            while width > 1 {
                let prev = levels.get(levels.len() - 1).unwrap();
                let mut next: Vec<BytesN<32>> = Vec::new(env);
                let mut i: u32 = 0;
                while i + 1 < width {
                    let parent = hash_pair(env, &prev.get(i).unwrap(), &prev.get(i + 1).unwrap());
                    next.push_back(parent);
                    i += 2;
                }
                if width % 2 == 1 {
                    // Odd trailing node: hash with itself (same rule as the
                    // contract's `hash_pair` convention).
                    let last = prev.get(width - 1).unwrap();
                    next.push_back(hash_pair(env, &last, &last));
                }
                levels.push_back(next.clone());
                width = next.len();
            }
            Tree { levels }
        }

        fn root(&self) -> BytesN<32> {
            self.levels
                .get(self.levels.len() - 1)
                .unwrap()
                .get(0)
                .unwrap()
        }

        /// The authentication path for leaf `idx`: sibling hashes plus a
        /// parallel vector marking whether each sibling is the left operand
        /// at its level.
        fn proof(&self, env: &Env, idx: u32) -> (Vec<BytesN<32>>, Vec<bool>) {
            let mut hashes: Vec<BytesN<32>> = Vec::new(env);
            let mut is_left: Vec<bool> = Vec::new(env);
            let mut i = idx;
            for level in 0..self.levels.len() - 1 {
                let nodes = self.levels.get(level).unwrap();
                let sib_i = if i % 2 == 0 { i + 1 } else { i - 1 };
                let last = nodes.len() - 1;
                if sib_i > last {
                    // Odd trailing node: its sibling is itself, hashed with
                    // itself. The flag is irrelevant to the result; record
                    // `false` (node on the left) to match `hash_pair`.
                    hashes.push_back(nodes.get(last).unwrap());
                    is_left.push_back(false);
                } else {
                    hashes.push_back(nodes.get(sib_i).unwrap());
                    is_left.push_back(i % 2 == 1);
                }
                i /= 2;
            }
            (hashes, is_left)
        }
    }

    fn sample_leaves(env: &Env) -> Vec<Leaf> {
        let mut leaves: Vec<Leaf> = Vec::new(env);
        for i in 0..5u32 {
            leaves.push_back(Leaf {
                index: i,
                claimant: Address::generate(env),
                amount: 100 * (i as i128 + 1),
            });
        }
        leaves
    }

    fn setup(env: &Env) -> (Address, Tree, Address, Vec<Leaf>) {
        let admin = Address::generate(env);
        let leaves = sample_leaves(env);
        let tree = Tree::new(env, &leaves);

        let contract_id = env.register(MerkleAirdrop, ());
        let client = MerkleAirdropClient::new(env, &contract_id);
        env.mock_all_auths();
        client.init(&admin, &tree.root());

        (admin, tree, contract_id, leaves)
    }

    #[test]
    fn valid_proof_claims() {
        let env = Env::default();
        let (_admin, tree, contract_id, leaves) = setup(&env);
        let client = MerkleAirdropClient::new(&env, &contract_id);

        assert!(!client.has_claimed(&2));

        let (hashes, is_left) = tree.proof(&env, 2);
        client.claim(&leaves.get(2).unwrap(), &hashes, &is_left);

        assert!(client.has_claimed(&2));
        assert_eq!(client.merkle_root(), tree.root());
    }

    #[test]
    fn tampered_proof_rejected() {
        let env = Env::default();
        let (_admin, tree, contract_id, leaves) = setup(&env);
        let client = MerkleAirdropClient::new(&env, &contract_id);

        // Tamper: flip one sibling's side flag so the pair hashes in the
        // wrong order and the recomputed root no longer matches.
        let (hashes, mut is_left) = tree.proof(&env, 1);
        is_left.set(0, !is_left.get(0).unwrap());

        let result = client.try_claim(&leaves.get(1).unwrap(), &hashes, &is_left);
        assert_eq!(result, Err(Ok(Error::InvalidProof)));
        assert!(!client.has_claimed(&1));
    }

    #[test]
    fn wrong_leaf_rejected() {
        let env = Env::default();
        let (_admin, _tree, contract_id, leaves) = setup(&env);
        let client = MerkleAirdropClient::new(&env, &contract_id);

        // Build a different tree over different leaves **in the same env**
        // and submit leaf 2 with a proof generated for leaf 3 of that tree:
        // the recomputed root cannot match this contract's root.
        let other_leaves = sample_leaves(&env);
        let other_tree = Tree::new(&env, &other_leaves);
        let (hashes, is_left) = other_tree.proof(&env, 3);

        let result = client.try_claim(&leaves.get(2).unwrap(), &hashes, &is_left);
        assert_eq!(result, Err(Ok(Error::InvalidProof)));
    }

    #[test]
    fn double_claim_rejected() {
        let env = Env::default();
        let (_admin, tree, contract_id, leaves) = setup(&env);
        let client = MerkleAirdropClient::new(&env, &contract_id);

        let (hashes, is_left) = tree.proof(&env, 0);
        client.claim(&leaves.get(0).unwrap(), &hashes, &is_left);

        // The same valid proof a second time must fail — the entry is spent.
        let result = client.try_claim(&leaves.get(0).unwrap(), &hashes, &is_left);
        assert_eq!(result, Err(Ok(Error::AlreadyClaimed)));
    }

    #[test]
    fn claim_before_init_fails() {
        let env = Env::default();
        let contract_id = env.register(MerkleAirdrop, ());
        let client = MerkleAirdropClient::new(&env, &contract_id);
        env.mock_all_auths();

        let leaves = sample_leaves(&env);
        let tree = Tree::new(&env, &leaves);
        let (hashes, is_left) = tree.proof(&env, 0);

        let result = client.try_claim(&leaves.get(0).unwrap(), &hashes, &is_left);
        assert_eq!(result, Err(Ok(Error::NotInitialized)));
    }

    #[test]
    fn init_twice_fails() {
        let env = Env::default();
        let (admin, tree, contract_id, _leaves) = setup(&env);
        let client = MerkleAirdropClient::new(&env, &contract_id);

        let result = client.try_init(&admin, &tree.root());
        assert_eq!(result, Err(Ok(Error::AlreadyInitialized)));
    }

    #[test]
    fn init_requires_admin_auth() {
        let env = Env::default();
        let admin = Address::generate(&env);
        let leaves = sample_leaves(&env);
        let tree = Tree::new(&env, &leaves);

        let contract_id = env.register(MerkleAirdrop, ());
        let client = MerkleAirdropClient::new(&env, &contract_id);
        // No `mock_all_auths`: `init` must require the admin's signature,
        // so the host rejects the invocation with an auth error.
        env.set_auths(&[]);

        let result = client.try_init(&admin, &tree.root());
        assert!(result.is_err());

        // Nothing was committed.
        assert_eq!(client.try_merkle_root(), Err(Ok(Error::NotInitialized)));
    }

    #[test]
    fn forged_zero_proof_rejected() {
        let env = Env::default();
        let (_admin, _tree, contract_id, leaves) = setup(&env);
        let client = MerkleAirdropClient::new(&env, &contract_id);

        // An attacker claims with a "proof" of all-zero siblings.
        let zeros = BytesN::from_array(&env, &[0u8; 32]);
        let mut hashes: Vec<BytesN<32>> = Vec::new(&env);
        let mut is_left: Vec<bool> = Vec::new(&env);
        for _ in 0..3 {
            hashes.push_back(zeros.clone());
            is_left.push_back(false);
        }

        let result = client.try_claim(&leaves.get(4).unwrap(), &hashes, &is_left);
        assert_eq!(result, Err(Ok(Error::InvalidProof)));
        assert!(!client.has_claimed(&4));
    }

    #[test]
    fn length_mismatch_rejected() {
        let env = Env::default();
        let (_admin, tree, contract_id, leaves) = setup(&env);
        let client = MerkleAirdropClient::new(&env, &contract_id);

        // Hash vector and position vector of different lengths cannot
        // describe a proof.
        let (hashes, _is_left) = tree.proof(&env, 2);
        let mut is_left: Vec<bool> = Vec::new(&env);
        is_left.push_back(false);

        let result = client.try_claim(&leaves.get(2).unwrap(), &hashes, &is_left);
        assert_eq!(result, Err(Ok(Error::MalformedProof)));
    }

    #[test]
    fn reset_then_reinit() {
        let env = Env::default();
        let (admin, _tree, contract_id, _leaves) = setup(&env);
        let client = MerkleAirdropClient::new(&env, &contract_id);

        client.reset();

        // After a reset a fresh root can be committed.
        let new_leaves = sample_leaves(&env);
        let new_tree = Tree::new(&env, &new_leaves);
        client.init(&admin, &new_tree.root());
        assert_eq!(client.merkle_root(), new_tree.root());
        assert!(!client.has_claimed(&0));
    }

    #[test]
    fn reset_after_claim_fails() {
        let env = Env::default();
        let (_admin, tree, contract_id, leaves) = setup(&env);
        let client = MerkleAirdropClient::new(&env, &contract_id);

        let (hashes, is_left) = tree.proof(&env, 3);
        client.claim(&leaves.get(3).unwrap(), &hashes, &is_left);

        let result = client.try_reset();
        assert_eq!(result, Err(Ok(Error::AlreadyClaimed)));

        // The claim and root survive the failed reset.
        assert!(client.has_claimed(&3));
        assert_eq!(client.merkle_root(), tree.root());
    }

    #[test]
    fn deep_tree_claim() {
        let env = Env::default();
        let admin = Address::generate(&env);

        // 8 leaves → depth-3 tree, exercises multi-level proofs.
        let mut leaves: Vec<Leaf> = Vec::new(&env);
        for i in 0..8u32 {
            leaves.push_back(Leaf {
                index: i,
                claimant: Address::generate(&env),
                amount: 1000 + i as i128,
            });
        }
        let tree = Tree::new(&env, &leaves);

        let contract_id = env.register(MerkleAirdrop, ());
        let client = MerkleAirdropClient::new(&env, &contract_id);
        env.mock_all_auths();
        client.init(&admin, &tree.root());

        let (hashes, is_left) = tree.proof(&env, 7);
        client.claim(&leaves.get(7).unwrap(), &hashes, &is_left);
        assert!(client.has_claimed(&7));
    }

    #[test]
    fn odd_node_tree_claim() {
        let env = Env::default();
        let admin = Address::generate(&env);

        // 5 leaves → an odd (promoted) node at the deepest level; the leaf
        // being claimed is the odd one, exercising the hash-with-self rule.
        let leaves = sample_leaves(&env);
        let tree = Tree::new(&env, &leaves);

        let contract_id = env.register(MerkleAirdrop, ());
        let client = MerkleAirdropClient::new(&env, &contract_id);
        env.mock_all_auths();
        client.init(&admin, &tree.root());

        let (hashes, is_left) = tree.proof(&env, 4);
        client.claim(&leaves.get(4).unwrap(), &hashes, &is_left);
        assert!(client.has_claimed(&4));
    }

    #[test]
    fn claimant_mismatch_rejected() {
        let env = Env::default();
        let (_admin, tree, contract_id, leaves) = setup(&env);
        let client = MerkleAirdropClient::new(&env, &contract_id);

        // Entry 0's proof is only valid for entry 0's (index, claimant,
        // amount) triple. Submitting a different leaf fails verification.
        let mut forged = leaves.get(0).unwrap();
        forged.claimant = Address::generate(&env);
        let (hashes, is_left) = tree.proof(&env, 0);

        let result = client.try_claim(&forged, &hashes, &is_left);
        assert_eq!(result, Err(Ok(Error::InvalidProof)));
    }
}
