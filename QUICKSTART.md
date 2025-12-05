# SysCat Quick Start Guide

Get SysCat running in 10 minutes.

## Step 1: Install Dependencies

```bash
npm install
```

## Step 2: Set Up Azure AD App Registration

1. Go to [Azure Portal](https://portal.azure.com)
2. Navigate to **Azure Active Directory** → **App registrations**
3. Click **New registration**
4. Name it "SysCat" (or whatever you want)
5. Set **Redirect URI** to: `https://login.microsoftonline.com/common/oauth2/nativeclient`
6. Click **Register**
7. Copy the **Application (client) ID** - you'll need this
8. Copy your **Tenant ID** from Azure AD Overview page
9. Go to **API permissions** → **Add a permission** → **Microsoft Graph** → **Delegated permissions**
10. Add these permissions:
    - `Directory.Read.All`
    - `User.Read.All`
    - `Organization.Read.All`
11. Click **Grant admin consent** (if you have permission)

## Step 3: Run SysCat

```bash
npm run dev
```

The app will launch automatically.

## Step 4: First-Time Setup

1. **Welcome Screen**: Click "Let's Get You Some Time Back"
2. **Connect Tenant**: 
   - Enter your Tenant ID
   - Enter your Client ID
   - Click "Save Configuration"
   - Click "Start Device Code Login"
   - Follow the instructions to authenticate
3. **First Scan**: The app will automatically scan your tenant
4. **View Results**: See your tenant summary and savings opportunities

## Step 5: Fix Safe Issues

Click the **"🛠️ Fix All Safe Issues"** button to:
- Reclaim unused licenses from disabled accounts
- Review inactive accounts
- Get security recommendations

## Troubleshooting

### "Module not found" errors
```bash
npm install
```

### "Cannot find module 'better-sqlite3'"
```bash
npm rebuild better-sqlite3
```

### Authentication fails
- Verify your Tenant ID and Client ID are correct
- Check that API permissions are granted
- Ensure admin consent was given

### Port 3000 already in use
```bash
# Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# macOS/Linux
lsof -ti:3000 | xargs kill -9
```

## Next Steps

- Configure automation rules in Settings
- Enable auto-fix for daily cleanup
- Review activity logs
- Export reports for management

## Need Help?

- Check the [README.md](README.md) for full documentation
- Open an issue on GitHub
- Join our Discord community

Happy automating! 🐱

