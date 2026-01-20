# Soroban Cookbook Documentation Website

A user-friendly documentation website for the [Soroban Cookbook](https://github.com/Soroban-Cookbook/Soroban-Cookbook-), making smart contract development accessible to developers of all skill levels.

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and npm
- Git

### Installation

```bash
# Install dependencies
npm install

# Start development server
npm start
```

The site will open at `http://localhost:3000`

## 📁 Project Structure

```
website/
├── docs/                    # MDX documentation files
│   ├── getting-started/    # Beginner tutorials
│   ├── concepts/           # Core Soroban concepts
│   └── patterns/           # Contract patterns library
├── src/
│   ├── components/         # React components
│   └── css/               # Global styles
├── scripts/               # Utility scripts
├── docusaurus.config.ts   # Docusaurus configuration
└── sidebars.ts            # Sidebar navigation
```

## 🛠️ Development

```bash
# Start dev server
npm start

# Build for production
npm run build

# Sync content from GitHub
npm run sync-content

# Type check
npm run typecheck
```

## 🚢 Deployment

Deploy to Vercel with one click:

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/Soroban-Cookbook/Soroban_Cookbook_online)

## 📚 Resources

- [Docusaurus Docs](https://docusaurus.io/docs)
- [Soroban Docs](https://developers.stellar.org/docs/smart-contracts)
- [Stellar Discord](https://discord.gg/stellardev)

## 📄 License

MIT License - Built by the community, powered by Stellar
