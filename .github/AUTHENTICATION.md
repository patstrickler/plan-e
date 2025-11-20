# Connecting Cursor to GitHub

## Quick Setup Options

### Option 1: Use Cursor's Built-in GitHub Integration (Easiest)

1. **Open Command Palette**: `Cmd+Shift+P` (Mac) or `Ctrl+Shift+P` (Windows/Linux)
2. **Search for**: `Git: Clone` or `GitHub: Sign In`
3. **Sign in with GitHub** - Cursor will open a browser window for authentication
4. Once authenticated, you can push/pull directly from Cursor

### Option 2: Personal Access Token (PAT)

1. **Create a Token on GitHub**:
   - Go to: https://github.com/settings/tokens
   - Click "Generate new token (classic)"
   - Name it: "Cursor/Plan-E"
   - Select scopes: **`repo`** (full control of private repositories)
   - Click "Generate token"
   - **COPY THE TOKEN** (you won't see it again! Starts with `ghp_`)

2. **Update Git Credentials**:
   ```bash
   # Delete old credentials
   security delete-internet-password -s github.com
   
   # Try pushing - it will prompt for credentials
   git push origin main
   # Username: patstrickler
   # Password: paste your token (ghp_xxxxx)
   ```

### Option 3: SSH Key (Most Secure)

1. **Generate SSH Key** (if you don't have one):
   ```bash
   ssh-keygen -t ed25519 -C "your-email@example.com"
   # Press Enter to accept default location
   # Enter a passphrase (optional but recommended)
   ```

2. **Add SSH Key to GitHub**:
   ```bash
   # Copy your public key
   cat ~/.ssh/id_ed25519.pub
   # Copy the output
   ```
   - Go to: https://github.com/settings/keys
   - Click "New SSH key"
   - Paste your public key
   - Save

3. **Update Remote to Use SSH**:
   ```bash
   git remote set-url origin git@github.com:patstrickler/plan-e.git
   ```

4. **Test Connection**:
   ```bash
   ssh -T git@github.com
   # Should say: Hi patstrickler! You've successfully authenticated...
   ```

5. **Push**:
   ```bash
   git push origin main
   ```

## Verify Connection

```bash
# Check remote URL
git remote -v

# Check if you can authenticate
git ls-remote origin

# If successful, push your commits
git push origin main
```

## Troubleshooting

- **403 Error**: Token expired or doesn't have `repo` scope
- **Permission denied (publickey)**: SSH key not added to GitHub
- **Repository not found**: Check repository name/path or permissions

