# Soroban Cookbook - Documentation Website

![Soroban Cookbook](https://img.shields.io/badge/Soroban-Cookbook-blue?style=for-the-badge&logo=stellar)
![License](https://img.shields.io/badge/license-MIT-green?style=for-the-badge)
![Status](https://img.shields.io/badge/status-MVP-orange?style=for-the-badge)

A user-friendly documentation website for the [Soroban Cookbook](https://github.com/Soroban-Cookbook/Soroban-Cookbook-), transforming how developers learn Soroban smart contract development through interactive examples and progressive learning paths.

## Features

- 📚 **Progressive Learning Paths** - Beginner to Advanced tutorials
- 🎨 **Beautiful UI** - Modern design with dark mode support
- 📱 **Fully Responsive** - Works perfectly on all devices
- ⚡ **Fast Performance** - Built with Docusaurus for optimal speed
- 🎯 **Difficulty Badges** - Patterns include difficulty badges (beginner, intermediate, advanced)
- 💻 **Rust code examples** - Patterns provide Rust contract implementations with tests

## 🎯 Planned Features

- ✨ Interactive Code Playgrounds
- 🔍 Smart Search

## 🚀 Quick Start

```bash
# Navigate to documentation directory
cd documentation

# Install dependencies
bun install  # (fallback: npm install)

# Start development server
bun start    # (fallback: npm start)
```

Visit `http://localhost:3000` to view the site.

## 📁 Project Structure

```
Soroban_Cookbook_online/
├── documentation/           # Main documentation site
│   ├── docs/               # MDX documentation files
│   ├── src/
│   │   ├── components/    # React components
│   │   ├── css/          # Styling
│   │   └── pages/        # Static pages
│   └── package.json
├── .github/workflows/     # CI/CD pipelines
└── README.md             # This file
```

## 🛠️ Tech Stack

- **Framework**: [Docusaurus 3](https://docusaurus.io/) with TypeScript
- **Language**: TypeScript + React 19
- **Package Manager**: [Bun](https://bun.sh/)
- **Deployment**: Vercel / GitHub Pages
- **Search**: Local search (via `docusaurus-plugin-search-local`)

## 📝 Development

### Available Scripts

#### Recommended (Bun)
```bash
bun start          # Start dev server
bun run build      # Build for production
bun run serve      # Serve production build
bun run typecheck  # Run TypeScript checks
bun run lint       # Lint code
bun run format     # Format code
```

#### Alternative (npm)
```bash
npm start          # Start dev server
npm run build      # Build for production
npm run serve      # Serve production build
npm run typecheck  # Run TypeScript checks
npm run lint       # Lint code
npm run format     # Format code
```

### Adding Content

1. Create a new `.mdx` or `.md` file in `documentation/docs/`
2. Add frontmatter with metadata
3. Update `documentation/sidebars.ts` for navigation

Example:

```mdx
---
sidebar_position: 1
title: My Pattern
---

## Overview

Content here...
```

## 🔄 CI/CD Pipeline

This project uses GitHub Actions for automated quality checks and deployments. See [CI_CD_PIPELINE.md](CI_CD_PIPELINE.md) for detailed documentation.

### Quality Checks (CI)

Automated checks run on every pull request and push to `main`:

- **Formatting** - Prettier code formatting validation
- **Linting** - ESLint code quality checks
- **TypeScript** - Type safety validation
- **Build** - Documentation build verification
- **Deployment** - Deployment configuration validation

### Deployment (CD)

Documentation automatically deploys to GitHub Pages after CI passes on `main` branch.

### Local Pre-commit Checks

Before pushing, run these commands:

```bash
cd documentation
# Recommended
bun install && bun run format:check && bun run lint && bun run typecheck && bun run build

# Alternative
npm install && npm run format:check && npm run lint && npm run typecheck && npm run build
```

## 🚢 Deployment

### Vercel (Recommended)

1. Push to GitHub
2. Import project in Vercel
3. Deploy automatically

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/Soroban-Cookbook/Soroban_Cookbook_online)

### GitHub Pages

Automatically deploys on push to `main` via GitHub Actions.

#### Required Repository Configuration

For the GitHub Actions deployment to work, ensure the following settings are configured in your repository:

1. **GitHub Pages Source**
   - Go to Settings → Pages
   - Set "Source" to "GitHub Actions"
   - This allows the workflow to deploy the built artifacts

2. **Branch Protection (Recommended)**
   - Go to Settings → Branches
   - Add rule for `main` branch
   - Require status checks to pass before merging
   - This ensures only successful builds are merged

3. **Workflow Permissions**
   - Go to Settings → Actions → General
   - Set "Workflow permissions" to "Read and write permissions"
   - This allows the workflow to deploy to Pages

4. **Environment Configuration**
   - The workflow uses the `github-pages` environment
   - Deployment URL will be available in workflow run details

#### Deployment Behavior

- **On Push to main**: Automatically builds and deploys docs
- **Manual Trigger**: Use "Run workflow" in Actions tab to manually deploy
- **Failure Handling**: Workflow fails explicitly if Pages is not configured (no silent skips)
- **Build Artifact**: Generated from `documentation/build` directory

## 🤝 Contributing

We welcome contributions of all kinds! Whether you're fixing a typo, adding a new contract pattern, or improving the UI, your help is appreciated.

To get started, please read our **[Contributing Guide](https://soroban-cookbook.com/docs/contributing)** for detailed instructions on:
- Setting up your local development environment.
- Branching and pull request conventions.
- Pre-submission validation steps.

We also have a [Pull Request Template](.github/pull_request_template.md) to help you structure your submissions.

## 🎨 Design System

### Colors (Planned)

- **Primary**: #0091FF (Stellar Blue)
- **Success**: #00D084
- **Warning**: #FFB84D
- **Error**: #FF5656

## 📊 Roadmap

### Phase 1: Setup ✅

- [x] Base Docusaurus setup
- [x] Core documentation structure
- [x] Deployment configuration
- [x] TypeScript support

### Phase 2: Content Development (Current)

- [ ] Getting started guides
- [ ] Smart contract patterns
- [ ] Code examples with tests
- [ ] Best practices documentation

### Phase 3: Interactivity

- [ ] Monaco Editor integration
- [ ] Live code playground
- [ ] Algolia DocSearch
- [ ] Custom React components

### Phase 4: Advanced Features

- [ ] Server-side compilation API
- [ ] Real testnet deployment
- [ ] Video tutorials
- [ ] Community contributions

## 📚 Resources

- [Soroban Cookbook GitHub](https://github.com/Soroban-Cookbook/Soroban-Cookbook-)
- [Soroban Documentation](http://web.archive.org/web/20240623060346/https://developers.stellar.org/docs/smart-contracts)
- [Stellar Developer Portal](https://developers.stellar.org/)
- [Stellar Discord](https://discord.gg/stellardev)
- [Docusaurus Docs](https://docusaurus.io/docs)

## 🐛 Troubleshooting

### Build fails

```bash
cd documentation
npm run clear
npm install
npm run build
```

### Port 3000 in use

```bash
npm start -- --port 3001
```

### TypeScript errors

```bash
npm run typecheck
```

## 📄 License

MIT License - see [LICENSE](LICENSE) for details.

The example code in `examples/` is also covered by the MIT license. If any examples were adapted from external sources, appropriate attribution would be provided.

## 🌟 Acknowledgments

- Built with [Docusaurus](https://docusaurus.io)
- Styled with [Tailwind CSS](https://tailwindcss.com)
- Powered by [Stellar](https://stellar.org)
- Content from [Soroban Cookbook](https://github.com/Soroban-Cookbook/Soroban-Cookbook-)

---

**Built by the community • Powered by Stellar • Written in Rust**

Questions? Join the [Stellar Discord](https://discord.gg/stellardev) or [open an issue](https://github.com/Soroban-Cookbook/Soroban_Cookbook_online/issues).
