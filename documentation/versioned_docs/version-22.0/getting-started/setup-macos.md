---
time: 25
title: setup-macos
---

# macOS Environment Setup

Set up your Soroban development environment on macOS. This guide covers Intel and Apple Silicon (M1/M2/M3) Macs running macOS 11 (Big Sur) or later.

## Prerequisites

Before you begin, ensure you have:

- **macOS 11 (Big Sur) or later** - Both Intel and Apple Silicon supported
- **Xcode Command Line Tools** - Required for compilation
- **Homebrew** - Package manager for macOS
- **Rust** - Latest stable version
- **Soroban CLI** - Command-line interface for Soroban
- **Code Editor** - VS Code or your preferred editor
- **Git** - Version control (included with Xcode)

## System Requirements

- **RAM**: Minimum 2GB (4GB+ recommended)
- **Disk Space**: At least 3GB free space
- **Internet**: Required for downloading dependencies
- **Apple Silicon Note**: Most tools now have native M1/M2/M3 support, but some may need Rosetta 2

## Installation Steps

### 1. Install Xcode Command Line Tools

Xcode Command Line Tools provide essential build tools and Git. These are required before installing Rust and other dependencies.

Check if already installed:

```bash
xcode-select --version
```

If not installed, install using:

```bash
xcode-select --install
```

A dialog box will appear. Click "Install" and wait for completion (this may take 10-15 minutes).

Verify installation:

```bash
gcc --version
make --version
git --version
```

All commands should return version information.

### 2. Install Homebrew

Homebrew is macOS's package manager, making it easy to install development tools.

Install Homebrew by running:

```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

**Apple Silicon Users**: After installation, add Homebrew to your PATH by adding the following line to your shell profile (`~/.zprofile` or `~/.bashrc`):

```bash
export PATH="/opt/homebrew/bin:$PATH"
```

Reload your shell:

```bash
source ~/.zprofile  # or source ~/.bashrc
```

**Intel Mac Users**: Homebrew installs to `/usr/local/bin` which is already in your PATH.

Verify installation:

```bash
brew --version
```

### 3. Install OpenSSL (Optional but Recommended)

Some Rust packages benefit from system-provided OpenSSL:

```bash
brew install openssl
```

### 4. Install Rust

Use Homebrew to install Rust (simplest method for macOS):

```bash
brew install rust
```

Alternatively, use rustup (official Rust installer) for more control:

```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
```

When prompted, select the default installation option by pressing Enter.

Load Rust into your current session:

```bash
source $HOME/.cargo/env
```

Verify installation:

```bash
rustc --version
cargo --version
```

Both commands should return version numbers.

### 5. Install Soroban CLI

Install the Soroban CLI using Cargo:

```bash
cargo install --locked soroban-cli
```

This may take several minutes as it compiles from source. For Apple Silicon, this will compile native binaries.

Verify installation:

```bash
soroban --version
```

### 6. Configure WebAssembly Target

Add the WebAssembly target to your Rust toolchain:

```bash
rustup target add wasm32-unknown-unknown
```

Verify the target was added:

```bash
rustup target list | grep wasm32-unknown-unknown
```

You should see `wasm32-unknown-unknown (installed)`.

### 7. Set Up Your Development Workspace

Create a workspace directory for your Soroban projects:

```bash
mkdir -p ~/soroban-projects
cd ~/soroban-projects
```

## Verify Your Complete Setup

Run this comprehensive verification to ensure everything is installed correctly:

```bash
echo "=== Xcode Command Line Tools Verification ==="
xcode-select --version
gcc --version

echo "=== Homebrew Verification ==="
brew --version

echo "=== Rust Verification ==="
rustc --version
cargo --version

echo "=== Soroban CLI Verification ==="
soroban --version

echo "=== WebAssembly Target Verification ==="
rustup target list | grep wasm32-unknown-unknown

echo "=== Git Verification ==="
git --version
```

All commands should return version information without errors.

## Environment Validation Checklist

Use this checklist to confirm your environment is ready:

- [ ] Xcode Command Line Tools: `xcode-select --version` returns a version number
- [ ] Homebrew installed: `brew --version` returns a version number
- [ ] Rust installed: `rustc --version` returns a version number
- [ ] Cargo installed: `cargo --version` returns a version number
- [ ] Soroban CLI installed: `soroban --version` returns a version number
- [ ] WebAssembly target available: `rustup target list | grep wasm32-unknown-unknown` shows `(installed)`
- [ ] Git installed: `git --version` returns a version number
- [ ] Internet connectivity: `curl https://www.google.com` succeeds

## Apple Silicon (M1/M2/M3) Specific Notes

### Native vs Rosetta 2

Most development tools now have native Apple Silicon support. Homebrew automatically installs native binaries when available.

**Check your architecture:**

```bash
uname -m
```

- Returns `arm64` = Apple Silicon (native)
- Returns `x86_64` = Intel or Rosetta 2

### Installing Native Binaries

Homebrew typically handles this automatically. If you need to force native installation:

```bash
# Remove and reinstall with native binaries
brew uninstall rust
brew install rust
```

### Path Configuration for Apple Silicon

If Homebrew installed to `/opt/homebrew/bin` and tools aren't found, add to your shell profile:

```bash
# Add to ~/.zprofile or ~/.bashrc
export PATH="/opt/homebrew/bin:$PATH"
```

Then reload:

```bash
source ~/.zprofile
```

## Troubleshooting

### Xcode Command Line Tools Installation Issues

#### Installation Fails or Hangs

**Problem**: `xcode-select --install` doesn't open dialog or hangs

**Solution**:
```bash
# Try removing and reinstalling
sudo rm -rf /Library/Developer/CommandLineTools
xcode-select --install

# Or download directly from Apple
# Visit: https://developer.apple.com/download/

# Check installation path
xcode-select -p
# Should return: /Library/Developer/CommandLineTools
```

#### "Can't find package to install" Error

**Problem**: Dialog shows "Can't find package to install"

**Solution**:
```bash
# Accept Xcode license
sudo xcode-select --reset
sudo xcodebuild -license accept

# Then try installation again
xcode-select --install
```

### Homebrew Issues

#### Homebrew Installation Fails

**Problem**: curl command fails or installation hangs

**Solution**:
```bash
# Check internet connection
ping -c 3 apple.com

# Try alternative installation method
ruby -e "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/master/install)"

# Or visit https://brew.sh for latest instructions
```

#### M1/M2 Homebrew in Wrong Location

**Problem**: Homebrew installed to `/usr/local` instead of `/opt/homebrew`

**Solution**:
```bash
# Check Homebrew location
which brew

# If in /usr/local, uninstall and reinstall
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/uninstall.sh)"

# Then reinstall
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Add to PATH if needed
echo 'export PATH="/opt/homebrew/bin:$PATH"' >> ~/.zprofile
source ~/.zprofile
```

#### "Permission Denied" When Installing Packages

**Problem**: `brew install` returns permission error

**Solution**:
```bash
# Check Homebrew directory ownership
ls -la /usr/local/Cellar

# Fix permissions
sudo chown -R $(whoami) /usr/local/Cellar
sudo chown -R $(whoami) /usr/local/bin

# Or reinstall Homebrew with correct permissions
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/uninstall.sh)"
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

### Rust Installation Issues

#### Rust Installation via Homebrew Fails

**Problem**: `brew install rust` fails or is slow

**Solution**:
```bash
# Try official rustup installer instead
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Then reload shell
source $HOME/.cargo/env

# Verify
rustc --version
```

#### "Command Not Found: rustc"

**Problem**: `rustc: command not found` after installation

**Solution**:
```bash
# Source Rust environment
source $HOME/.cargo/env

# Add to shell profile to persist
echo 'source $HOME/.cargo/env' >> ~/.zprofile

# Reload shell
source ~/.zprofile

# Verify
rustc --version
```

#### M1/M2 Rust Compilation Slow

**Problem**: Building Rust projects takes very long on Apple Silicon

**Solution**:
```bash
# Ensure you have native toolchain
rustup target list | grep wasm32-unknown-unknown
# Should show: wasm32-unknown-unknown (installed)

# Update toolchain
rustup update

# Clean and rebuild
cargo clean
cargo build --release
```

### Soroban CLI Issues

#### Soroban Installation Hangs or Times Out

**Problem**: `cargo install --locked soroban-cli` takes too long or times out

**Solution**:
```bash
# Try with verbose output
cargo install --locked soroban-cli -v

# Check internet connection
ping -c 3 github.com

# If network is slow, try again later or use:
cargo install --locked soroban-cli --version 20.0.0
```

#### "Soroban Command Not Found"

**Problem**: `soroban: command not found`

**Solution**:
```bash
# Check if Cargo bin is in PATH
echo $PATH | grep cargo

# If not, add it
echo 'export PATH="$HOME/.cargo/bin:$PATH"' >> ~/.zprofile
source ~/.zprofile

# Verify
soroban --version
```

#### Build Fails with Linker Error

**Problem**: `error: linker 'cc' not found` or similar

**Solution**:
```bash
# Ensure Xcode Command Line Tools are installed
xcode-select --install

# Verify installation
gcc --version

# Try installation again
cargo install --locked soroban-cli
```

### PATH and Environment Issues

#### Tools Installed but Not Found

**Problem**: Commands like `rustc` or `soroban` not found despite installation

**Solution**:
```bash
# Check your shell
echo $SHELL

# For zsh (default on macOS 10.15+)
# Add to ~/.zprofile:
export PATH="$HOME/.cargo/bin:$PATH"
export PATH="/opt/homebrew/bin:$PATH"  # For M1/M2

# For bash
# Add to ~/.bash_profile or ~/.bashrc:
export PATH="$HOME/.cargo/bin:$PATH"
export PATH="/usr/local/bin:$PATH"  # For Intel

# Reload configuration
source ~/.zprofile  # or source ~/.bash_profile
```

#### Multiple Rust Installations Conflict

**Problem**: Both Homebrew and rustup Rust installed, causing conflicts

**Solution**:
```bash
# Remove Homebrew version
brew uninstall rust

# Use only rustup version
# Verify
rustc --version
which rustc

# Should return ~/.cargo/bin/rustc
```

### SSL/Certificate Issues

#### SSL Certificate Verification Failed

**Problem**: `SSL: CERTIFICATE_VERIFY_FAILED` when downloading dependencies

**Solution**:
```bash
# Update CA certificates (usually automatic on macOS)
# If issue persists, try:
/Applications/Python\ 3.x/Install\ Certificates.command

# Or update Git
brew install git

# Try installation again
cargo install --locked soroban-cli
```

### Disk Space Issues

#### "No Space Left on Device" Error

**Problem**: Installation fails due to insufficient disk space

**Solution**:
```bash
# Check available space
df -h

# Clean up Cargo cache
cargo clean

# Remove old Rust toolchains
rustup toolchain list
rustup toolchain uninstall <old-toolchain>

# Clean Homebrew cache
brew cleanup
```

### Code Editor Setup

#### VS Code Rust Analyzer Issues

**Problem**: Rust analyzer not working in VS Code

**Solution**:
1. Install "Rust-analyzer" extension in VS Code
2. Install "CodeLLDB" extension for debugging
3. Reload VS Code
4. Check that Rust path is correct:

```bash
# In VS Code Terminal
which rustc
which cargo
```

#### VS Code Terminal Doesn't See Tools

**Problem**: Terminal in VS Code can't find `rustc` or `soroban`

**Solution**:
1. Close VS Code completely
2. Open terminal and verify tools work: `rustc --version`
3. Reopen VS Code
4. Open integrated terminal (Ctrl+`)
5. Tools should now be available

If still not working, add to VS Code settings:

```json
"terminal.integrated.inheritEnv": true
```

## macOS-Specific Tips

### Using Terminal Profiles Efficiently

Create a dedicated terminal profile for Soroban development:

```bash
# Open ~/.zprofile (or ~/.bash_profile for bash)
nano ~/.zprofile

# Add these lines at the end:
export SOROBAN_RPC_HOST="http://localhost:8000"
export SOROBAN_NETWORK_PASSPHRASE="Test SDF Network ; September 2015"

# Save and reload
source ~/.zprofile
```

### Speeding Up Builds

```bash
# Use all CPU cores for building
cargo build --release -j $(sysctl -n hw.ncpu)

# Or set in Cargo.toml
[profile.release]
codegen-units = 1
lto = true
```

### Monitoring Build Performance

```bash
# Use cargo-tree to understand dependencies
cargo install cargo-tree
cargo tree

# Check build times
cargo build -v

# Profile compilation
cargo build -v --timings
```

## Next Steps

Now that your macOS environment is ready:

1. [Create your first contract](./first-contract.md)
2. [Learn core concepts](../concepts/overview)
3. [Deploy to testnet](./deploy-testnet.md)
4. [Explore patterns](../patterns/overview)

## Additional Resources

- [Homebrew Documentation](https://docs.brew.sh/)
- [Rust Installation Guide](https://www.rust-lang.org/tools/install)
- [Soroban Official Documentation](https://developers.stellar.org/docs/smart-contracts)
- [Stellar Discord Community](https://discord.gg/stellardev)
- [Apple Developer Documentation](https://developer.apple.com/documentation/)
- [macOS Command Line Reference](https://ss64.com/osx/)

## Need Help?

If you encounter issues not covered in this guide:

1. Check the [Soroban Documentation](https://developers.stellar.org/docs/smart-contracts)
2. Ask in the [Stellar Discord](https://discord.gg/stellardev)
3. Search existing [GitHub Issues](https://github.com/Soroban-Cookbook/Soroban-Cookbook-/issues)
4. Create a new issue with detailed error messages and your macOS version (run `sw_vers`)
