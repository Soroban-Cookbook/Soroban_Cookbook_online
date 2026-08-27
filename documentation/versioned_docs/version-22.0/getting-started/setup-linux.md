---
time: 20
sidebar_position: 1
title: Setup on Linux
description: Set up your Soroban development environment on Linux — complete guide for Ubuntu, Debian, and other distributions.
---

# Linux Environment Setup

title: Linux Environment Setup
description: Set up your Soroban development environment on Linux.
sidebar_position: 3
---

Set up your Soroban development environment on Linux to start building smart contracts. This guide covers Ubuntu/Debian-based distributions with notes for other Linux distros.

## Prerequisites

Before you begin, ensure you have:

- **Linux OS** - Ubuntu 20.04+, Debian 11+, or other modern distributions
- **Rust** - Latest stable version
- **Soroban CLI** - Command-line interface for Soroban
- **Code Editor** - VS Code or your preferred editor
- **Git** - Version control
- **Build Tools** - Essential development packages

## System Requirements

- **RAM**: Minimum 2GB (4GB+ recommended)
- **Disk Space**: At least 2GB free space
- **Internet**: Required for downloading dependencies

## Installation Steps

### 1. Update System Packages

First, update your package manager to ensure you have the latest package lists:

**Ubuntu/Debian:**

```bash
sudo apt update
sudo apt upgrade -y
```

**Fedora/RHEL/CentOS:**

```bash
sudo dnf update -y
```

**Arch Linux:**

```bash
sudo pacman -Syu
```

### 2. Install Build Tools and Dependencies

You'll need essential build tools and libraries to compile Rust and Soroban CLI.

**Ubuntu/Debian:**

```bash
sudo apt install -y build-essential pkg-config libssl-dev curl git
```

**Fedora/RHEL/CentOS:**

```bash
sudo dnf install -y gcc gcc-c++ make pkg-config openssl-devel curl git
```

**Arch Linux:**

```bash
sudo pacman -S base-devel openssl curl git
```

**Alpine Linux:**

```bash
apk add --no-cache build-base openssl-dev curl git
```

### 3. Install Rust

Download and install Rust using rustup (the official Rust installer):

```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
```

When prompted, select the default installation option by pressing Enter.

After installation, load Rust into your current shell session:

```bash
source $HOME/.cargo/env
```

**Note:** For non-interactive installations (e.g., in scripts), use:

```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
```

Verify Rust installation:

```bash
rustc --version
cargo --version
```

You should see version numbers for both commands.

### 4. Install Soroban CLI

Install the Soroban CLI using Cargo:

```bash
cargo install --locked soroban-cli
```

This may take several minutes as it compiles from source.

Verify installation:

```bash
soroban --version
```

### 5. Configure WebAssembly Target

Add the WebAssembly target to your Rust toolchain:

```bash
rustup target add wasm32-unknown-unknown
```

Verify the target was added:

```bash
rustup target list | grep wasm32-unknown-unknown
```

You should see `wasm32-unknown-unknown (installed)`.

## Verify Your Complete Setup

Run this comprehensive verification to ensure everything is installed correctly:

```bash
echo "=== Rust Verification ==="
rustc --version
cargo --version

echo "=== Soroban CLI Verification ==="
soroban --version

echo "=== WebAssembly Target Verification ==="
rustup target list | grep wasm32-unknown-unknown

echo "=== Git Verification ==="
git --version

echo "=== Build Tools Verification ==="
gcc --version
```

All commands should return version information without errors.

## Environment Validation Checklist

Use this checklist to confirm your environment is ready:

- [ ] Rust installed: `rustc --version` returns a version number
- [ ] Cargo installed: `cargo --version` returns a version number
- [ ] Soroban CLI installed: `soroban --version` returns a version number
- [ ] WebAssembly target available: `rustup target list | grep wasm32-unknown-unknown` shows `(installed)`
- [ ] Git installed: `git --version` returns a version number
- [ ] Build tools available: `gcc --version` returns a version number
- [ ] Internet connectivity: `curl https://www.google.com` succeeds

## Troubleshooting

### Permission Issues

**Problem:** `Permission denied` when running installation commands

**Solution:**

```bash
# For curl/rustup installation, ensure you have write permissions to home directory
ls -la ~/.cargo

# If permissions are wrong, fix them:
chmod -R u+w ~/.cargo

# For system package installation, use sudo:
sudo apt install package-name
```

### PATH Issues

**Problem:** `command not found: soroban` or `command not found: rustc`

**Solution:**

```bash
# Ensure Cargo bin directory is in your PATH
echo $PATH | grep ".cargo/bin"

# If not present, add it to your shell profile:
# For bash, add to ~/.bashrc:
export PATH="$HOME/.cargo/bin:$PATH"

# For zsh, add to ~/.zshrc:
export PATH="$HOME/.cargo/bin:$PATH"

# Then reload your shell:
source ~/.bashrc  # or source ~/.zshrc
```

### SSL/TLS Certificate Errors

**Problem:** `SSL: CERTIFICATE_VERIFY_FAILED` when downloading Rust

**Solution:**

```bash
# Update CA certificates
sudo apt install -y ca-certificates  # Ubuntu/Debian
sudo dnf install -y ca-certificates  # Fedora/RHEL

# Try the installation again
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
```

### Cargo Installation Hangs or Times Out

**Problem:** `cargo install soroban-cli` takes too long or times out

**Solution:**

```bash
# Increase the timeout and use verbose output
cargo install --locked soroban-cli -v

# If still failing, check your internet connection:
ping -c 3 github.com

# Try with a specific version if latest fails:
cargo install --locked soroban-cli --version 20.0.0
```

### Build Fails with "linker not found"

**Problem:** Error like `error: linker 'cc' not found`

**Solution:**

```bash
# Reinstall build tools
sudo apt install -y build-essential  # Ubuntu/Debian
sudo dnf install -y gcc gcc-c++ make  # Fedora/RHEL
sudo pacman -S base-devel  # Arch Linux
```

### Disk Space Issues

**Problem:** `No space left on device` during installation

**Solution:**

```bash
# Check available disk space
df -h

# Clean up package manager cache
sudo apt clean  # Ubuntu/Debian
sudo dnf clean all  # Fedora/RHEL
sudo pacman -Sc  # Arch Linux

# Remove old Rust toolchains if needed
rustup toolchain list
rustup toolchain uninstall <toolchain-name>
```

## Multi-Distro Notes

### Ubuntu/Debian (Recommended for Beginners)

- Most widely tested with Soroban development
- Excellent package availability
- Large community support
- Use `apt` for package management

### Fedora/RHEL/CentOS

- Uses `dnf` instead of `apt`
- May require additional repositories for some packages
- Strong enterprise support
- Slightly newer packages than Ubuntu

### Arch Linux

- Rolling release model (always latest packages)
- Minimal base system (install only what you need)
- Excellent documentation (Arch Wiki)
- Use `pacman` for package management

### Alpine Linux

- Lightweight and minimal
- Uses `apk` for package management
- Good for containerized development
- May require additional development packages

### openSUSE

- Uses `zypper` for package management
- Good system stability
- Install build tools with: `sudo zypper install -t pattern devel_basis`

## Next Steps

Now that your Linux environment is ready:

1. [Create your first contract](./first-contract.md)
2. [Learn core concepts](../concepts/overview)
3. [Deploy to testnet](./deploy-testnet.md)
4. [Explore patterns](../patterns/overview)

## Additional Resources

- [Rust Installation Guide](https://www.rust-lang.org/tools/install)
- [Soroban Official Documentation](https://developers.stellar.org/docs/build/smart-contracts)
- [Stellar Discord Community](https://discord.gg/stellardev)
- [Linux Package Management Guide](https://wiki.archlinux.org/title/Pacman/Rosetta)

## Need Help?

If you encounter issues not covered in this guide:

1. Check the [Soroban Documentation](https://developers.stellar.org/docs/build/smart-contracts)
2. Ask in the [Stellar Discord](https://discord.gg/stellardev)
3. Search existing [GitHub Issues](https://github.com/Soroban-Cookbook/Soroban_Cookbook_online/issues)
4. Create a new issue with detailed error messages and your Linux distribution info
