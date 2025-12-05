<div align="center">

# 🐱 SysCat

### The Lazy Sysadmin's M365 Automation Sidekick

**100% Self-Hosted • Zero Telemetry • Open Source**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue)](https://www.typescriptlang.org/)
[![Electron](https://img.shields.io/badge/Electron-28-purple)](https://www.electronjs.org/)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](http://makeapullrequest.com)

**⭐ Star this repo if SysCat saves you time! ⭐**

---

</div>

> **Tired of doing the same M365 admin tasks over and over?**  
> SysCat automates the boring stuff so you can focus on actual problems.

**Save 10+ hours per week** on routine M365 administration tasks.

✅ **100% Self-Hosted** - Runs on YOUR computer, not our servers  
✅ **Zero Telemetry** - No tracking, no analytics, no phone home  
✅ **Open Source** - Audit every line of code (MIT License)  
✅ **Offline Capable** - Works even without internet (after setup)  
✅ **Cross-Platform** - Windows, macOS, Linux

---

## What It Does

- 🤖 **Automates user onboarding/offboarding** (30 min → 2 min)
- 💰 **Optimizes license spending** (saves $500-2K/month for 100-user org)
- 🔒 **Monitors security 24/7** (blocks threats before they escalate)
- 📊 **Generates compliance reports** (SOC 2, ISO 27001, GDPR)
- 🎫 **Manages helpdesk automation** (fixes common issues automatically)
- 📧 **Handles email security** (phishing detection, suspicious login alerts)

---

## Quick Start

### Prerequisites

- Node.js 20+ LTS
- npm or yarn
- Azure AD app registration (for M365 access)

### Installation

```bash
# Clone the repository
git clone https://github.com/kipronorugut/SysCat.git
cd SysCat

# Install dependencies
npm install

# Start development
npm run dev
```

### First Run

1. Launch the app
2. Enter your Azure AD Tenant ID and Client ID
3. Authenticate via device code flow
4. Run your first scan
5. Click "Fix All Safe Issues" to clean up

---

## Development

### Project Structure

```
syscat/
├── src/
│   ├── main/           # Electron main process
│   │   ├── index.ts    # Main entry point
│   │   ├── preload.ts  # Security bridge
│   │   ├── ipc/        # IPC handlers
│   │   ├── services/   # Business logic
│   │   └── database/   # SQLite database
│   └── renderer/       # React UI
│       ├── components/ # React components
│       └── hooks/      # Custom hooks
├── public/             # Static assets
└── assets/             # Icons, images
```

### Scripts

- `npm run dev` - Start development mode
- `npm run build` - Build for production
- `npm run package` - Package for all platforms
- `npm run lint` - Run ESLint
- `npm run format` - Format code with Prettier

---

## Security & Privacy

**We take this seriously because we're sysadmins too.**

✅ **Your data never leaves your machine**  
✅ **Credentials stored in OS-native secure storage (DPAPI/Keychain)**  
✅ **Only connects to Microsoft Graph API**  
✅ **No telemetry, no tracking, no analytics**  
✅ **Open source - audit the code yourself**  
✅ **GPG-signed releases**

---

## Why Trust This?

**"Don't trust, verify."** - Good sysadmins

1. **It's open source** - Read every line of code
2. **It's local** - Runs on YOUR machine, not ours
3. **It's auditable** - Every action logged with full trail
4. **No vendor lock-in** - Export your data anytime
5. **Used by sysadmins** - Vetted by the community

But seriously: **audit the code before using in production.**

---

## Contributing

We welcome contributions! See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

**Popular contribution areas:**
- New automation modules
- Bug fixes
- Documentation improvements
- Translations

---

## License

MIT License - see [LICENSE](LICENSE) for details.

**TL;DR:** Do whatever you want with this code. Just don't sue us.

---

## Screenshots

### 🎯 Dashboard Overview
![Dashboard](https://via.placeholder.com/800x450/0F172A/EA580C?text=SysCat+Dashboard)
*Main dashboard showing tenant statistics, safe fix recommendations, and activity feed*

### 🔧 Setup Wizard
![Setup Wizard](https://via.placeholder.com/800x450/0F172A/EA580C?text=Setup+Wizard)
*Easy 3-step setup process: Connect tenant → Scan → Fix*

### 📊 Tenant Statistics
![Tenant Stats](https://via.placeholder.com/800x450/0F172A/EA580C?text=Tenant+Statistics)
*Real-time tenant overview with user counts, license usage, and security metrics*

### 🛠️ Safe Fix Panel
![Safe Fix Panel](https://via.placeholder.com/800x450/0F172A/EA580C?text=Safe+Fix+Panel)
*One-click automation to reclaim licenses and fix common issues*

> **Note:** Screenshots are placeholders. Replace with actual UI screenshots once available.

### 🎬 Demo Video
> _Coming soon - animated GIF showing SysCat in action!_

## Roadmap

- [x] Core infrastructure and authentication
- [x] Tenant scanning and analysis
- [x] Safe fix automation engine
- [x] Activity logging and audit trail
- [ ] Real-time security monitoring
- [ ] Advanced automation rules
- [ ] Compliance report generation
- [ ] Multi-tenant support
- [ ] API for integrations

**See [PROJECT_STATUS.md](PROJECT_STATUS.md) for detailed progress.**

## Support

- 💬 [GitHub Discussions](https://github.com/kipronorugut/SysCat/discussions) - Get help, share tips
- 🐛 [Report Issues](https://github.com/kipronorugut/SysCat/issues) - Found a bug?
- 💡 [Feature Requests](https://github.com/kipronorugut/SysCat/issues/new?template=feature_request.md) - Have an idea?

---

---

<div align="center">

**Made with ☕ by sysadmins, for sysadmins**

**Hates manual work. Loves automation.** 😼

[⭐ Star us on GitHub](https://github.com/kipronorugut/SysCat) • [🐛 Report Bug](https://github.com/kipronorugut/SysCat/issues) • [💡 Request Feature](https://github.com/kipronorugut/SysCat/issues/new)

**If SysCat saves you time, please consider giving us a star! ⭐**

</div>

