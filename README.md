# Soroban Cookbook - Documentation Website

![Soroban Cookbook](https://img.shields.io/badge/Soroban-Cookbook-blue?style=for-the-badge&logo=stellar)
![License](https://img.shields.io/badge/license-MIT-green?style=for-the-badge)
![Status](https://img.shields.io/badge/status-MVP-orange?style=for-the-badge)

A user-friendly documentation website for the [Soroban Cookbook](https://github.com/Soroban-Cookbook/Soroban-Cookbook-), transforming how developers learn Soroban smart contract development through interactive examples and progressive learning paths.

## 🌟 Features

- ✨ **Interactive Code Examples** - Live code playgrounds with Rust syntax highlighting
- 📚 **Progressive Learning Paths** - Beginner to Advanced tutorials
- 🎨 **Beautiful UI** - Modern design with dark mode support
- 🔍 **Smart Search** - Fast documentation search (Algolia integration ready)
- 📱 **Fully Responsive** - Works perfectly on all devices
- ⚡ **Fast Performance** - Built with Docusaurus for optimal speed
- 🎯 **Difficulty Badges** - Clear indicators for skill level

## 🚀 Quick Start

```bash
# Navigate to website directory
cd website

# Install dependencies
npm install

# Start development server
npm start
```

Visit `http://localhost:3000` to view the site.

## 📁 Project Structure

```
Soroban_Cookbook_online/
├── website/                 # Main documentation site
│   ├── docs/               # MDX documentation files
│   │   ├── getting-started/
│   │   ├── concepts/
│   │   └── patterns/
│   ├── src/
│   │   ├── components/    # React components
│   │   ├── css/          # Styling
│   │   └── pages/        # Static pages
│   ├── scripts/          # Utility scripts
│   └── package.json
├── .github/workflows/     # CI/CD pipelines
└── README.md             # This file
```

## 🛠️ Tech Stack

- **Framework**: [Docusaurus 3](https://docusaurus.io/) with TypeScript
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/)
- **Language**: TypeScript + React
- **Deployment**: Vercel / GitHub Pages
- **Search**: Algolia DocSearch (coming soon)

## 📝 Development

### Available Scripts

```bash
npm start          # Start dev server
npm run build      # Build for production
npm run serve      # Serve production build
npm run sync-content  # Sync from GitHub repo
npm run typecheck  # Run TypeScript checks
```

### Adding Content

1. Create a new `.mdx` file in `docs/`
2. Add frontmatter with metadata
3. Update `sidebars.ts` for navigation
4. Use `PatternCard` component for patterns

Example:

```mdx
---
sidebar_position: 1
title: My Pattern
---

import PatternCard from '@site/src/components/PatternCard';

<PatternCard metadata={{
  title: "My Pattern",
  difficulty: "intermediate",
  estimatedTime: "20 min"
}}>

Content here...

</PatternCard>
```

## 🚢 Deployment

### Vercel (Recommended)

1. Push to GitHub
2. Import project in Vercel
3. Deploy automatically

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/Soroban-Cookbook/Soroban_Cookbook_online)

### GitHub Pages

Automatically deploys on push to `main` via GitHub Actions.

## 🤝 Contributing

We welcome contributions! Here's how:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test locally
5. Submit a pull request

See [CONTRIBUTING.md](CONTRIBUTING.md) for detailed guidelines.

## 🎨 Design System

### Colors

- **Primary**: #0091FF (Stellar Blue)
- **Success**: #00D084
- **Warning**: #FFB84D
- **Error**: #FF5656

### Difficulty Badges

- 🟢 **Beginner** - `.badge-beginner`
- 🟡 **Intermediate** - `.badge-intermediate`
- 🔴 **Advanced** - `.badge-advanced`

## 📊 Roadmap

### Phase 1: MVP ✅
- [x] Base Docusaurus setup
- [x] Core documentation structure
- [x] Custom React components
- [x] Tailwind CSS integration
- [x] Sample patterns and tutorials
- [x] Deployment configuration

### Phase 2: Interactivity (In Progress)
- [ ] Monaco Editor integration
- [ ] Live code playground
- [ ] Gitpod one-click environments
- [ ] Algolia DocSearch
- [ ] Progress tracking

### Phase 3: Advanced Features
- [ ] Server-side compilation API
- [ ] Real testnet deployment from playground
- [ ] Advanced search filters
- [ ] Video tutorials
- [ ] Community contributions

## 📚 Resources

- [Soroban Cookbook GitHub](https://github.com/Soroban-Cookbook/Soroban-Cookbook-)
- [Soroban Documentation](https://developers.stellar.org/docs/smart-contracts)
- [Stellar Developer Portal](https://developers.stellar.org/)
- [Stellar Discord](https://discord.gg/stellardev)
- [Docusaurus Docs](https://docusaurus.io/docs)

## 🐛 Troubleshooting

### Build fails
```bash
cd website
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

## 🌟 Acknowledgments

- Built with [Docusaurus](https://docusaurus.io)
- Styled with [Tailwind CSS](https://tailwindcss.com)
- Powered by [Stellar](https://stellar.org)
- Content from [Soroban Cookbook](https://github.com/Soroban-Cookbook/Soroban-Cookbook-)

---

**Built by the community • Powered by Stellar • Written in Rust**

Questions? Join the [Stellar Discord](https://discord.gg/stellardev) or [open an issue](https://github.com/Soroban-Cookbook/Soroban_Cookbook_online/issues).
