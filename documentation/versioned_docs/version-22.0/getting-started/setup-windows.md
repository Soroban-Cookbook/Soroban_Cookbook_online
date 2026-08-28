---
time: 30
sidebar_position: 2
title: Setup on Windows
description: Set up your Soroban development environment on Windows — guides for both WSL 2 and native Windows installation.
---

# Windows Environment Setup

title: Windows Environment Setup
description: Complete guide to setting up Soroban development on Windows with WSL 2.
sidebar_position: 2
---

Set up your Soroban development environment on Windows. This guide covers both WSL (Windows Subsystem for Linux) - the recommended approach - and native Windows installation.

## Quick Decision: WSL vs Native

| Aspect           | WSL 2 (Recommended) | Native Windows |
| ---------------- | ------------------- | -------------- |
| Setup Complexity | Moderate            | High           |
| Performance      | Excellent           | Good           |
| Compatibility    | Best (Linux-based)  | Limited        |
| Troubleshooting  | Easier              | More issues    |
| Recommended For  | Most developers     | Advanced users |

**Recommendation**: Use WSL 2 for the smoothest experience. Native Windows setup is more complex due to toolchain differences.

## Prerequisites

Before you begin, ensure you have:

- **Windows 10 (Build 19041+) or Windows 11** - For WSL 2 support
- **Administrator access** - Required for WSL installation
- **Internet connection** - For downloading dependencies
- **Disk space** - At least 5GB free (WSL) or 3GB (native)
- **RAM** - Minimum 4GB (8GB+ recommended)

## Part 1: WSL 2 Setup (Recommended)

### Step 1: Enable WSL 2

Open PowerShell as Administrator and run:

```powershell
wsl --install
```

This command:

- Enables the WSL 2 feature
- Installs Ubuntu as the default Linux distribution
- Sets WSL 2 as the default version

Expected output:

```
Installing: Virtual Machine Platform
Virtual Machine Platform has been installed.
Installing: Windows Subsystem for Linux
Windows Subsystem for Linux has been installed.
Downloading: Ubuntu
Installing: Ubuntu
Ubuntu has been installed.
Launching Ubuntu...
```

### Step 2: Complete Ubuntu Setup

After installation, Ubuntu will launch. You'll be prompted to:

1. Create a username (use lowercase, no spaces)
2. Create a password (you'll need this for `sudo` commands)

Example:

```
Installing, this may take a few minutes...
Please create a default UNIX user account. The username does not need to match your Windows user name.
For more information visit: https://aka.ms/wsldocs
Enter new UNIX username: soroban
New password: ••••••••
Retype new password: ••••••••
passwd: password updated successfully
Installation successful!
```

### Step 3: Update WSL Ubuntu

Inside the WSL terminal, update your system:

```bash
sudo apt update
sudo apt upgrade -y
```

### Step 4: Install Build Tools

Install essential development packages:

```bash
sudo apt install -y build-essential pkg-config libssl-dev curl git
```

### Step 5: Install Rust

Download and install Rust:

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

### Step 6: Install Soroban CLI

Install using Cargo:

```bash
cargo install --locked soroban-cli
```

This may take several minutes.

Verify installation:

```bash
soroban --version
```

### Step 7: Configure WebAssembly Target

Add the WebAssembly target:

```bash
rustup target add wasm32-unknown-unknown
```

Verify:

```bash
rustup target list | grep wasm32-unknown-unknown
```

### Step 8: Access Your Windows Files from WSL

Your Windows drives are automatically mounted in WSL. Access them via:

```bash
# Navigate to Windows home directory
cd /mnt/c/Users/YourUsername

# Or use the shortcut
cd ~
```

### Step 9: Set Up Your Development Workspace

Create a workspace directory:

```bash
# Create in your WSL home directory (recommended)
mkdir -p ~/soroban-projects
cd ~/soroban-projects

# Or create in Windows and access via WSL
mkdir -p /mnt/c/Users/YourUsername/soroban-projects
cd /mnt/c/Users/YourUsername/soroban-projects
```

### Verify WSL Setup

Run this verification script:

```bash
echo "=== WSL Verification ==="
wsl --list --verbose
echo ""
echo "=== Rust Verification ==="
rustc --version
cargo --version
echo ""
echo "=== Soroban CLI Verification ==="
soroban --version
echo ""
echo "=== WebAssembly Target Verification ==="
rustup target list | grep wasm32-unknown-unknown
```

Expected output:

```
=== WSL Verification ===
  * Ubuntu                            Running           2

=== Rust Verification ===
rustc 1.75.0 (1d8b05fc5 2023-12-21)
cargo 1.75.0 (ecb9851af 2023-10-18)

=== Soroban CLI Verification ===
soroban 20.0.0

=== WebAssembly Target Verification ===
wasm32-unknown-unknown (installed)
```

---

## Part 2: Native Windows Setup (Alternative)

**Note**: This approach is more complex. WSL 2 is strongly recommended.

### Step 1: Install Rust for Windows

Download the Rust installer from [rust-lang.org](https://www.rust-lang.org/tools/install):

1. Download `rustup-init.exe`
2. Run the installer
3. When prompted, select option `1` (default installation)
4. The installer will download and install Rust

Verify installation by opening a new PowerShell and running:

```powershell
rustc --version
cargo --version
```

### Step 2: Install Build Tools

You need Microsoft C++ Build Tools. Download from [Visual Studio](https://visualstudio.microsoft.com/downloads/):

1. Download "Build Tools for Visual Studio"
2. Run the installer
3. Select "Desktop development with C++"
4. Complete the installation

### Step 3: Install Git

Download Git from [git-scm.com](https://git-scm.com/download/win):

1. Run the installer
2. Use default settings (important: keep line ending conversion enabled)
3. Complete installation

Verify:

```powershell
git --version
```

### Step 4: Install Soroban CLI

Open PowerShell and run:

```powershell
cargo install --locked soroban-cli
```

This may take several minutes.

Verify:

```powershell
soroban --version
```

### Step 5: Configure WebAssembly Target

```powershell
rustup target add wasm32-unknown-unknown
```

Verify:

```powershell
rustup target list | grep wasm32-unknown-unknown
```

### Step 6: Configure Git Line Endings

**Important**: Configure Git to handle line endings correctly:

```powershell
git config --global core.autocrlf true
```

This prevents issues when working with Unix-based tools.

### Step 7: Set Up Your Development Workspace

Create a workspace directory:

```powershell
mkdir C:\soroban-projects
cd C:\soroban-projects
```

### Verify Native Setup

Run this verification script in PowerShell:

```powershell
Write-Host "=== Rust Verification ===" -ForegroundColor Green
rustc --version
cargo --version
Write-Host ""
Write-Host "=== Soroban CLI Verification ===" -ForegroundColor Green
soroban --version
Write-Host ""
Write-Host "=== WebAssembly Target Verification ===" -ForegroundColor Green
rustup target list | Select-String "wasm32-unknown-unknown"
Write-Host ""
Write-Host "=== Git Verification ===" -ForegroundColor Green
git --version
```

---

## Accessing Your Code Editor

### VS Code with WSL

**Recommended setup for WSL users:**

1. Install VS Code on Windows from [code.visualstudio.com](https://code.visualstudio.com)
2. Install the "Remote - WSL" extension in VS Code
3. Open VS Code and click the green icon in the bottom-left corner
4. Select "Connect to WSL"
5. Open your project folder in WSL

This gives you the best of both worlds: Windows UI with Linux development environment.

### VS Code with Native Windows

1. Install VS Code on Windows
2. Install the "Rust-analyzer" extension
3. Open your project folder directly

### Other Editors

- **JetBrains CLion**: Works with both WSL and native
- **Vim/Neovim**: Available in WSL terminal
- **Sublime Text**: Works with both WSL and native

---

## Verification Checklist

Use this checklist to confirm your setup is complete:

### WSL Setup

- [ ] WSL 2 installed: `wsl --list --verbose` shows Ubuntu with version 2
- [ ] Ubuntu updated: `sudo apt update && sudo apt upgrade -y` completes
- [ ] Rust installed: `rustc --version` returns a version number
- [ ] Cargo installed: `cargo --version` returns a version number
- [ ] Soroban CLI installed: `soroban --version` returns a version number
- [ ] WebAssembly target: `rustup target list | grep wasm32-unknown-unknown` shows `(installed)`
- [ ] Git installed: `git --version` returns a version number
- [ ] VS Code Remote WSL extension installed (optional but recommended)

### Native Windows Setup

- [ ] Rust installed: `rustc --version` returns a version number
- [ ] Cargo installed: `cargo --version` returns a version number
- [ ] Build tools installed: Visual Studio Build Tools present
- [ ] Soroban CLI installed: `soroban --version` returns a version number
- [ ] WebAssembly target: `rustup target list | grep wasm32-unknown-unknown` shows `(installed)`
- [ ] Git installed: `git --version` returns a version number
- [ ] Git line endings configured: `git config --global core.autocrlf` returns `true`

---

## Troubleshooting

### WSL Issues

#### WSL Installation Fails

**Problem**: `Error: The system cannot find the file specified` or installation hangs

**Solution**:

```powershell
# Ensure you're running PowerShell as Administrator
# Check Windows version
[System.Environment]::OSVersion.Version

# Should be 10.0.19041 or higher for WSL 2
# If older, update Windows first

# Try manual installation
wsl --install -d Ubuntu
```

#### WSL 2 Not Available

**Problem**: `Error: WSL 2 requires an update to its kernel component`

**Solution**:

```powershell
# Download and install WSL 2 kernel update
# Visit: https://aka.ms/wsl2kernel

# After installation, set WSL 2 as default
wsl --set-default-version 2

# Verify
wsl --list --verbose
```

#### Cannot Access Windows Files from WSL

**Problem**: `/mnt/c` doesn't exist or is inaccessible

**Solution**:

```bash
# Check if mount exists
ls /mnt

# If not present, restart WSL
wsl --shutdown

# Then reopen WSL terminal
```

#### Rust Installation Fails in WSL

**Problem**: `error: could not compile 'soroban-cli'`

**Solution**:

```bash
# Update build tools
sudo apt update
sudo apt install -y build-essential pkg-config libssl-dev

# Clean and retry
cargo clean
cargo install --locked soroban-cli -v
```

#### Slow Performance in WSL

**Problem**: Commands are slow, especially file operations

**Solution**:

```bash
# Store projects in WSL filesystem, not Windows
# Good: ~/soroban-projects
# Avoid: /mnt/c/Users/...

# Check disk usage
df -h

# If full, clean up
cargo clean
```

### Native Windows Issues

#### Rust Installation Fails

**Problem**: `error: Microsoft Visual C++ 14.0 or greater is required`

**Solution**:

1. Download Build Tools for Visual Studio from [visualstudio.microsoft.com](https://visualstudio.microsoft.com/downloads/)
2. Run installer and select "Desktop development with C++"
3. Complete installation
4. Restart PowerShell and retry Rust installation

#### Soroban CLI Installation Hangs

**Problem**: `cargo install soroban-cli` takes too long or times out

**Solution**:

```powershell
# Try with verbose output
cargo install --locked soroban-cli -v

# Check internet connection
Test-NetConnection -ComputerName github.com -Port 443

# If network is slow, try again later
```

#### PATH Issues - Commands Not Found

**Problem**: `soroban: The term 'soroban' is not recognized`

**Solution**:

```powershell
# Check if Cargo bin is in PATH
$env:PATH -split ';' | Select-String 'cargo'

# If not present, add it manually
$CargoPath = "$env:USERPROFILE\.cargo\bin"
[Environment]::SetEnvironmentVariable("PATH", "$env:PATH;$CargoPath", "User")

# Restart PowerShell for changes to take effect
```

#### Line Ending Issues

**Problem**: Scripts fail with `^M` characters or "bad interpreter" errors

**Solution**:

```powershell
# Configure Git to handle line endings
git config --global core.autocrlf true

# For existing repositories
git config core.autocrlf true

# Convert existing files
git add --renormalize .
git commit -m "Normalize line endings"
```

#### Permission Denied Errors

**Problem**: `Permission denied` when running scripts

**Solution**:

```powershell
# Check execution policy
Get-ExecutionPolicy

# If Restricted, change it
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser

# For scripts in current directory
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope Process
```

#### Build Fails with "linker not found"

**Problem**: `error: linker 'cc' not found` or similar

**Solution**:

```powershell
# Ensure Build Tools are installed
# Download from: https://visualstudio.microsoft.com/downloads/

# Verify installation
rustc --version --verbose

# Should show MSVC version information
```

### Cross-Platform Issues

#### Line Ending Conflicts

**Problem**: Files have different line endings on Windows vs WSL

**Solution**:

```bash
# In WSL, configure Git
git config --global core.autocrlf input

# In PowerShell, configure Git
git config --global core.autocrlf true

# This ensures consistent line endings across platforms
```

#### Antivirus Interference

**Problem**: Installation is slow or fails intermittently

**Solution**:

1. Add your project directory to antivirus exclusions
2. Temporarily disable antivirus during installation
3. Check antivirus logs for blocked operations

#### Disk Space Issues

**Problem**: `No space left on device` during installation

**Solution**:

```powershell
# Check available space
Get-Volume

# Clean up
# Delete old Rust toolchains
rustup toolchain list
rustup toolchain uninstall <old-version>

# Clean Cargo cache
cargo clean
```

---

## Command Reference

### WSL Commands

| Command                       | Purpose                      |
| ----------------------------- | ---------------------------- |
| `wsl --install`               | Install WSL 2 with Ubuntu    |
| `wsl --list --verbose`        | List installed distributions |
| `wsl --shutdown`              | Shut down all WSL instances  |
| `wsl -d Ubuntu`               | Launch specific distribution |
| `wsl --set-default-version 2` | Set WSL 2 as default         |

### Rust Commands (Same on WSL and Native)

| Command                                    | Purpose                |
| ------------------------------------------ | ---------------------- |
| `rustc --version`                          | Check Rust version     |
| `cargo --version`                          | Check Cargo version    |
| `rustup target add wasm32-unknown-unknown` | Add WebAssembly target |
| `rustup target list`                       | List available targets |
| `rustup toolchain list`                    | List Rust toolchains   |

### Soroban Commands (Same on WSL and Native)

| Command                             | Purpose                    |
| ----------------------------------- | -------------------------- |
| `soroban --version`                 | Check Soroban CLI version  |
| `soroban contract init my-contract` | Create new contract        |
| `soroban contract build`            | Build contract to WASM     |
| `soroban contract deploy`           | Deploy contract to testnet |

---

## WSL vs Native Comparison

### WSL 2 Advantages

- ✅ Better compatibility with Soroban tooling
- ✅ Faster build times
- ✅ Easier troubleshooting (Linux-based)
- ✅ Better performance for file operations
- ✅ Seamless integration with VS Code
- ✅ Fewer PATH and permission issues

### WSL 2 Disadvantages

- ❌ Requires Windows 10/11 with virtualization enabled
- ❌ Slightly more setup complexity
- ❌ Requires learning basic Linux commands

### Native Windows Advantages

- ✅ No virtualization overhead
- ✅ Direct Windows integration
- ✅ Familiar Windows tools

### Native Windows Disadvantages

- ❌ More complex toolchain setup
- ❌ More PATH and permission issues
- ❌ Line ending complications
- ❌ Slower builds
- ❌ More troubleshooting needed

---

## Next Steps

Now that your Windows environment is set up:

1. [Create your first contract](./first-contract.md)
2. [Deploy to testnet](./deploy-testnet.md)
3. [Learn core concepts](../concepts/overview)
4. [Explore patterns](../patterns/overview)

## Additional Resources

- [WSL Documentation](https://learn.microsoft.com/en-us/windows/wsl/)
- [Rust Installation Guide](https://www.rust-lang.org/tools/install)
- [Soroban CLI Documentation](https://developers.stellar.org/docs/build/smart-contracts/getting-started/setup#install-the-stellar-cli)
- [VS Code Remote WSL](https://code.visualstudio.com/docs/remote/wsl)
- [Git for Windows](https://git-scm.com/download/win)
- [Stellar Discord Community](https://discord.gg/stellardev)

## Need Help?

If you encounter issues not covered in this guide:

1. Check the [Soroban Documentation](https://developers.stellar.org/docs/build/smart-contracts)
2. Search [GitHub Issues](https://github.com/Soroban-Cookbook/Soroban_Cookbook_online/issues)
3. Ask in the [Stellar Discord](https://discord.gg/stellardev)
4. Create a new issue with your error message and Windows version info
