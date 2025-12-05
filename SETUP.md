# Development Setup Guide

Complete guide for setting up SysCat for development.

## Prerequisites

- **Node.js** 20+ LTS ([Download](https://nodejs.org/))
- **npm** (comes with Node.js)
- **Git** ([Download](https://git-scm.com/))
- **Azure AD** account with admin permissions (for testing)

## Installation

### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/syscat.git
cd syscat
```

### 2. Install Dependencies

```bash
npm install
```

This will install:
- Electron and all dependencies
- React and UI libraries
- TypeScript and build tools
- Microsoft Graph SDK
- SQLite database driver

### 3. Build the Project

```bash
npm run build
```

This compiles TypeScript and bundles the app.

## Development Workflow

### Start Development Server

```bash
npm run dev
```

This will:
- Start webpack dev server for React (port 3000)
- Watch and rebuild main process on changes
- Launch Electron automatically
- Open DevTools for debugging

### Project Structure

```
syscat/
├── src/
│   ├── main/              # Electron main process
│   │   ├── index.ts       # Entry point
│   │   ├── preload.ts     # Security bridge
│   │   ├── ipc/           # IPC handlers
│   │   ├── services/      # Business logic
│   │   └── database/      # SQLite setup
│   └── renderer/          # React UI
│       ├── components/    # React components
│       └── hooks/         # Custom hooks
├── public/                # Static files
└── assets/                # Icons, images
```

### Code Quality

```bash
# Lint code
npm run lint

# Fix linting issues
npm run lint:fix

# Format code
npm run format
```

## Building for Production

### Build All Platforms

```bash
npm run build
npm run package
```

### Build Specific Platform

```bash
# Windows
npm run package:win

# macOS
npm run package:mac

# Linux
npm run package:linux
```

Outputs will be in the `release/` directory.

## Testing

### Manual Testing Checklist

- [ ] App launches without errors
- [ ] Can configure Azure AD credentials
- [ ] Device code authentication works
- [ ] Tenant scan completes successfully
- [ ] Safe fix plan generates correctly
- [ ] Database creates and stores data
- [ ] System tray icon appears
- [ ] Notifications work (if enabled)

### Debugging

**Main Process Logs:**
- Check Electron console output
- Logs also written to: `~/Library/Logs/syscat/` (macOS) or `%APPDATA%/syscat/logs/` (Windows)

**Renderer Process:**
- DevTools open automatically in dev mode
- Use `window.syscatApi.logDebug()` for custom logging

**Database:**
- Database file: `~/Library/Application Support/syscat/data/syscat.db` (macOS)
- Use SQLite browser to inspect: [DB Browser](https://sqlitebrowser.org/)

## Environment Variables

Create a `.env` file (optional):

```env
NODE_ENV=development
ELECTRON_IS_DEV=1
```

## Common Issues

### SQLite Build Errors

```bash
npm rebuild better-sqlite3
```

### Electron Not Found

```bash
npm install electron --save-dev
```

### TypeScript Errors

```bash
npm run build
# Check tsconfig.json settings
```

### Webpack Errors

```bash
rm -rf node_modules dist
npm install
npm run build
```

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for contribution guidelines.

## Resources

- [Electron Docs](https://www.electronjs.org/docs)
- [React Docs](https://react.dev)
- [Microsoft Graph API](https://docs.microsoft.com/en-us/graph/overview)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)

Happy coding! 🚀

