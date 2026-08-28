---
title: Video Tutorial Script - Getting Started
description: Complete script and production plan for "Getting Started with Soroban" video tutorial
sidebar_label: Video - Getting Started
---

# Video Tutorial Script: Getting Started with Soroban

**Duration:** 8-10 minutes  
**Target Audience:** Developers new to Soroban, familiar with basic programming  
**Difficulty Level:** Beginner  

## Video Objectives

By the end of this video, viewers will:
- Understand what Soroban is and why it matters
- Have a working Soroban development environment
- Know where to find resources and help
- Be ready to create their first contract

## Script Structure

### Opening (0:00 - 0:30)

**[VISUAL: Animated Stellar + Soroban logo]**

**Narrator:**
"Welcome to Soroban — Stellar's smart contract platform. In this tutorial, we'll get your development environment set up so you can start building on one of the fastest, most efficient blockchain platforms available. Let's dive in."

**[VISUAL: Quick preview montage of what we'll build — terminal commands, VS Code, successful test output]**

---

### Section 1: What is Soroban? (0:30 - 1:30)

**[VISUAL: Animated diagram showing blockchain → Stellar → Soroban]**

**Narrator:**
"Soroban is Stellar's smart contract platform. It lets you write secure, efficient contracts in Rust that compile to WebAssembly. Unlike other platforms, Soroban is designed for performance and low transaction costs."

**[VISUAL: Side-by-side comparison graphic]**
- Fast execution
- Low fees
- Built-in token standards
- Rust-based security

**Narrator:**
"Whether you're building DeFi apps, payment systems, or tokenized assets, Soroban gives you the tools you need."

---

### Section 2: Prerequisites Check (1:30 - 2:00)

**[VISUAL: Checklist appearing on screen]**

**Narrator:**
"Before we start, here's what you'll need:"

**[VISUAL: Each item checks off as mentioned]**
- ✓ A computer running Linux, macOS, or Windows
- ✓ Basic command-line familiarity
- ✓ A code editor — we recommend VS Code
- ✓ About 10 minutes of your time

**Narrator:**
"No prior blockchain experience required. If you've written code before, you're ready."

---

### Section 3: Installing Rust (2:00 - 3:30)

**[VISUAL: Split screen — terminal on left, narrator notes on right]**

**Narrator:**
"First, we need Rust. Open your terminal and run this command:"

**[VISUAL: Command appears on screen with cursor highlighting]**

```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
```

**[VISUAL: Terminal shows installation progress]**

**Narrator:**
"This installs rustup, Rust's official toolchain manager. Just follow the prompts — the defaults work great."

**[VISUAL: Installation completes, command prompt returns]**

**Narrator:**
"Once that's done, restart your terminal or run this command to update your PATH:"

```bash
source $HOME/.cargo/env
```

**[VISUAL: Verification command]**

**Narrator:**
"Let's verify the installation:"

```bash
rustc --version
cargo --version
```

**[VISUAL: Version output appears]**

**Narrator:**
"Perfect. You should see version numbers for both rustc and cargo."

**[CALLOUT BOX: "Windows users: See our Windows-specific setup guide in the documentation"]**

---

### Section 4: Installing Soroban CLI (3:30 - 4:30)

**[VISUAL: Terminal focused]**

**Narrator:**
"Next, we install the Soroban CLI — your command center for smart contract development."

**[VISUAL: Command appears]**

```bash
cargo install --locked soroban-cli
```

**Narrator:**
"This will take a few minutes. Cargo is downloading and compiling the Soroban tools."

**[VISUAL: Time-lapse of compilation output, then completion]**

**Narrator:**
"Once it's finished, verify the installation:"

```bash
soroban --version
```

**[VISUAL: Version output]**

**Narrator:**
"Great! The Soroban CLI is ready. This tool handles everything — creating projects, building contracts, running tests, and deploying to networks."

---

### Section 5: Configure WebAssembly Target (4:30 - 5:15)

**[VISUAL: Terminal]**

**Narrator:**
"Soroban contracts compile to WebAssembly, so we need to add the WASM target to Rust:"

```bash
rustup target add wasm32-unknown-unknown
```

**[VISUAL: Download and installation progress]**

**Narrator:**
"This downloads the WebAssembly compilation target. You only need to do this once."

**[VISUAL: Success message]**

---

### Section 6: Verification & Testing (5:15 - 6:15)

**[VISUAL: Terminal, clean slate]**

**Narrator:**
"Let's make sure everything works together. Run:"

```bash
soroban --help
```

**[VISUAL: Help output scrolling]**

**Narrator:**
"You should see the Soroban command list. Try creating a test project:"

```bash
soroban contract init hello-soroban
cd hello-soroban
```

**[VISUAL: Directory structure appears]**

**Narrator:**
"This creates a new contract project with a sample Hello World contract. Now build it:"

```bash
soroban contract build
```

**[VISUAL: Compilation output, success]**

**Narrator:**
"If you see 'Finished release,' congratulations! Your environment is working perfectly."

---

### Section 7: Editor Setup (6:15 - 7:00)

**[VISUAL: VS Code opening]**

**Narrator:**
"Let's set up your editor. If you're using VS Code, open the Extensions panel and search for 'rust-analyzer.'"

**[VISUAL: Extension search, install button]**

**Narrator:**
"Install rust-analyzer — it provides autocomplete, error checking, and inline documentation."

**[VISUAL: Extension installed, showing features in action]**

**Narrator:**
"You might also want the 'Better TOML' extension for editing Cargo.toml files."

**[VISUAL: Opening hello-soroban project in VS Code]**

---

### Section 8: What's Next (7:00 - 8:00)

**[VISUAL: Split screen with documentation site]**

**Narrator:**
"Your environment is ready! Here's what to explore next:"

**[VISUAL: Animated cards appearing]**

1. **First Contract Tutorial** — Build and deploy a working smart contract
2. **Core Concepts** — Learn about storage, authorization, and events
3. **Pattern Library** — Real-world examples you can adapt

**Narrator:**
"Check out the Soroban Cookbook at [URL] for step-by-step guides, tested code examples, and best practices."

**[VISUAL: Quick preview of cookbook homepage]**

---

### Section 9: Resources & Community (8:00 - 8:30)

**[VISUAL: Resource links appearing]**

**Narrator:**
"Need help? Join us:"

- **Stellar Discord** — Active developer community at discord.gg/stellardev
- **Soroban Docs** — developers.stellar.org/docs/build/smart-contracts
- **GitHub** — Browse examples at github.com/stellar/soroban-examples

**Narrator:**
"Everyone starts somewhere. The community is friendly and ready to help."

---

### Closing (8:30 - 9:00)

**[VISUAL: Return to animated logo]**

**Narrator:**
"You've just set up a complete Soroban development environment. In the next video, we'll write, test, and deploy your first smart contract. See you there!"

**[VISUAL: End screen with links]**
- Next: Your First Contract →
- Documentation
- Subscribe for more tutorials

**[FADE OUT]**

---

## Visual Aids Needed

### Graphics & Animations

1. **Opening animation** — Stellar/Soroban logo with motion
2. **What is Soroban diagram** — Blockchain architecture visual
3. **Comparison chart** — Soroban vs other platforms
4. **Checklist animation** — Prerequisites checking off
5. **Split-screen template** — Terminal + notes layout
6. **Callout boxes** — Warning/info/tip styling
7. **Success checkmarks** — Green animated checks
8. **Resource cards** — Animated cards for "What's Next"
9. **End screen** — Branded template with links

### Screen Recordings Required

1. **Rust installation** — Full terminal recording
2. **Soroban CLI installation** — Compilation process
3. **WASM target setup** — Quick terminal recording
4. **Test project creation** — soroban init through build
5. **VS Code setup** — Extension installation walkthrough
6. **Documentation preview** — Quick tour of cookbook site

### Text Overlays

- Command snippets (syntax highlighted)
- Key points and definitions
- URLs and resource links
- Error messages and solutions
- Platform-specific callouts

---

## Recording Technical Specs

### Resolution & Format
- **Video:** 1920x1080 (1080p)
- **Frame Rate:** 30fps
- **Format:** MP4 (H.264)
- **Bitrate:** 8-10 Mbps

### Audio
- **Narrator:** Professional voiceover or clear USB microphone
- **Format:** 48kHz, 16-bit, stereo
- **Background music:** Subtle, non-distracting (30-40% volume)

### Terminal Recordings
- **Font:** Fira Code or JetBrains Mono
- **Size:** 16-18pt
- **Theme:** Dark theme with high contrast
- **Window:** Maximized terminal, clean prompt

### Code Editor Recordings
- **Theme:** Dark+ or One Dark Pro
- **Font:** Fira Code with ligatures
- **Zoom:** 140-150% for readability
- **Layout:** Hide unnecessary panels

---

## Talking Points for Narrator

### Key Messages to Emphasize

1. **Accessibility** — No blockchain expertise needed
2. **Speed** — "This will take just a few minutes"
3. **Reliability** — "The defaults work great"
4. **Support** — "Community is here to help"
5. **Momentum** — "You're ready to build"

### Tone Guidelines

- Friendly and encouraging
- Clear and precise
- Avoid jargon (or explain it immediately)
- Assume intelligence, not prior knowledge
- Build confidence progressively

### Common Pitfalls to Address

- PATH issues after Rust installation → show the source command
- Compilation time for Soroban CLI → mention it's normal
- Windows-specific differences → point to dedicated guide
- Version compatibility → emphasize using latest stable

---

## Production Checklist

### Pre-Production
- [ ] Script finalized and reviewed
- [ ] Visual assets designed
- [ ] Test recordings completed
- [ ] Audio equipment tested
- [ ] Software versions confirmed

### Recording
- [ ] Terminal recordings captured (clean, no errors)
- [ ] VS Code walkthrough recorded
- [ ] Voiceover recorded (full script)
- [ ] B-roll and transitions captured
- [ ] Screenshots for callouts captured

### Post-Production
- [ ] Video edited with transitions
- [ ] Graphics and animations added
- [ ] Text overlays synced
- [ ] Background music mixed
- [ ] Color correction applied
- [ ] Captions/subtitles generated

### Quality Assurance
- [ ] Full playthrough (check audio/video sync)
- [ ] Commands verified (correct and current)
- [ ] Links tested
- [ ] Accessibility review (captions, contrast)
- [ ] Technical review by developer

### Distribution
- [ ] Upload to video platform
- [ ] Embed in documentation
- [ ] Social media posts prepared
- [ ] Community announcement drafted

---

## Timeline

### Week 1: Pre-Production
- **Day 1-2:** Script review and finalization
- **Day 3-4:** Visual asset design and creation
- **Day 5:** Test recordings and validation

### Week 2: Production
- **Day 1-2:** Screen recordings and captures
- **Day 3-4:** Voiceover recording and pickup
- **Day 5:** Asset compilation and preparation

### Week 3: Post-Production
- **Day 1-3:** Video editing and animation
- **Day 4:** Audio mixing and color grading
- **Day 5:** Quality assurance and revisions

### Week 4: Finalization
- **Day 1-2:** Final reviews and adjustments
- **Day 3:** Caption generation and accessibility
- **Day 4:** Upload and embed preparation
- **Day 5:** Launch and promotion

---

## Success Metrics

Track these metrics post-launch:
- View count and watch time
- Drop-off points (optimize future videos)
- Comments and questions (FAQ opportunities)
- Link clicks to documentation
- Follow-up tutorial engagement

---

## Notes for Future Iterations

- Consider platform-specific versions (Linux/Mac/Windows)
- Add timestamps to video description for easy navigation
- Create a companion blog post with written instructions
- Prepare troubleshooting addendum for common issues
- Plan advanced follow-up for experienced developers

