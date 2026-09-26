# Python SDK

This page shows backend developers how to install the Stellar Python SDK
(`stellar-sdk`) and invoke a Soroban smart contract on testnet from Python.

> **SDK version tested:** `stellar-sdk >= 11.0`  
> **Python version:** 3.9 +

---

## Install

```bash
pip install stellar-sdk
```

For isolated environments (recommended):

```bash
python -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install stellar-sdk
```

---

## Invoke the Hello World contract

The contract below is the standard Soroban `hello_world` deployed on testnet.
Replace `CONTRACT_ID` with your own contract address.

```python
import asyncio
from stellar_sdk import Keypair, Network, SorobanServer
from stellar_sdk.soroban_rpc import GetTransactionStatus
from stellar_sdk import TransactionBuilder
from stellar_sdk.xdr import SCVal, SCValType

# ── Config ────────────────────────────────────────────────────────────────────
TESTNET_RPC   = "https://soroban-testnet.stellar.org"
TESTNET_PASSPHRASE = Network.TESTNET_NETWORK_PASSPHRASE
CONTRACT_ID   = "CAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD2KM"
SECRET_KEY    = "SCZANGBA5RLUF5RSKW7OJ7MFL5BKVH5NRFJJ4CVUZMKUUQZSRPFRVQR"  # replace

async def invoke_hello() -> None:
    server = SorobanServer(TESTNET_RPC)
    keypair = Keypair.from_secret(SECRET_KEY)

    # Load the current account sequence number.
    account = await server.load_account(keypair.public_key)

    # Build the call: `hello(to: Symbol)` → Vec<Symbol>
    tx = (
        TransactionBuilder(
            source_account=account,
            network_passphrase=TESTNET_PASSPHRASE,
            base_fee=100,
        )
        .append_invoke_contract_function_op(
            contract_id=CONTRACT_ID,
            function_name="hello",
            parameters=[SCVal(SCValType.SCV_SYMBOL, sym=b"World")],
        )
        .set_timeout(30)
        .build()
    )

    # Simulate to get the resource footprint, then sign and send.
    simulation = await server.simulate_transaction(tx)
    tx = simulation.restore_transaction(tx)
    tx.sign(keypair)

    response = await server.send_transaction(tx)
    print(f"Submitted: {response.hash}")

    # Poll until finalized (testnet confirms in ~5 s).
    while True:
        result = await server.get_transaction(response.hash)
        if result.status != GetTransactionStatus.NOT_FOUND:
            break
        await asyncio.sleep(1)

    if result.status == GetTransactionStatus.SUCCESS:
        # result.result_value is the return Vec<Symbol>
        words = [e.sym.decode() for e in result.result_value.vec.sc_vec]
        print("Contract returned:", words)   # ['Hello', 'World']
    else:
        print("Transaction failed:", result)

    await server.close()

if __name__ == "__main__":
    asyncio.run(invoke_hello())
```

### What the script does

| Step | Description |
|---|---|
| Load account | Fetches the latest sequence number for the source account |
| Build transaction | Calls `hello(Symbol("World"))` on the contract |
| Simulate | Gets the Soroban resource footprint needed for fees |
| Sign & send | Signs with the keypair and submits to the RPC |
| Poll | Waits for ledger closure (~5 s on testnet) |
| Decode result | Extracts the returned `Vec<Symbol>` |

---

## Fund a test account

```python
import httpx, asyncio

async def fund(address: str) -> None:
    async with httpx.AsyncClient() as client:
        r = await client.get(
            f"https://friendbot.stellar.org?addr={address}"
        )
        r.raise_for_status()
        print("Funded:", address)

asyncio.run(fund(Keypair.random().public_key))
```

---

## Verification steps

1. `pip install stellar-sdk` — installs without error  
2. Run the script against testnet — prints `['Hello', 'World']`  
3. Swap in your contract address and function — script adapts with no other changes  

---

## Related

- [Deploy to testnet](./deploy-testnet.md)
- [First contract](./first-contract.md)
- [Stellar Python SDK on PyPI](https://pypi.org/project/stellar-sdk/)
