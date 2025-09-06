# Troubleshooting Guide

Common issues and their solutions when using zcc.

## Installation Issues

### npm error code ENOVERSIONS
**Error**: `npm error code ENOVERSIONS - No versions available for zcc`

**Cause**: Package not yet published to npm registry

**Solution**: 
```bash
# Use the full package name
npm install -g z-claude-code

# Or use local development version
git clone https://github.com/git-on-my-level/zcc.git
cd zcc && npm install && npm run build
node /path/to/zcc/dist/cli.js init
```

---

### zcc: command not found
**Error**: `bash: zcc: command not found`

**Cause**: Package not installed globally or PATH not configured

**Solutions**:
1. Use npx: `npx zcc init`
2. Install globally: `npm install -g z-claude-code`
3. Check PATH: `echo $PATH` and ensure npm global bin is included
4. Find npm bin: `npm config get prefix` then add `/bin` to PATH

---

## Initialization Issues

### zcc is already initialized
**Error**: `zcc is already initialized in this project`

**Solution**: 
```bash
# Force reinitialize
zcc init --force

# Or with a specific pack
zcc init --force --pack frontend-react
```

---

### Permission denied errors
**Error**: `EACCES: permission denied`

**Solutions**:
1. Check directory permissions: `ls -la .claude .zcc`
2. Fix ownership: `sudo chown -R $(whoami) .claude .zcc`
3. Remove and reinitialize: `rm -rf .claude .zcc && zcc init`

---

## Claude Code Integration Issues

### Commands not recognized
**Problem**: Claude Code doesn't recognize `/mode`, `/ticket`, etc.

**Solutions**:
1. Ensure `.claude/commands/` directory exists
2. Check command files: `ls .claude/commands/`
3. Restart Claude Code after initialization
4. Verify settings: `cat .claude/settings.local.json`

---

### Hooks not triggering
**Problem**: Hooks don't execute on prompts

**Solutions**:
1. Check hook registration: `zcc hook list`
2. Verify settings.local.json has hooks configured
3. Check hook script permissions: `ls -la .zcc/hooks/scripts/`
4. Make scripts executable: `chmod +x .zcc/hooks/scripts/*.sh`

---

### Permissions blocked by Claude Code
**Problem**: Claude Code blocks script execution

**Solutions**:
1. Check allowed tools in `.claude/settings.local.json`
2. Regenerate permissions: `zcc init --force`
3. Manually add permissions if needed:
```json
{
  "permissions": {
    "allow": [
      "Bash(sh .zcc/scripts/mode-switch.sh:*)",
      "Bash(sh .zcc/scripts/ticket-context.sh:*)"
    ]
  }
}
```

---

## Component Issues

### Mode/Workflow not found
**Error**: `Mode 'custom-mode' not found`

**Solutions**:
1. List available: `zcc list`
2. Check installation: `zcc list --installed`
3. Add component: `zcc add mode <name>`
4. Check fuzzy matching: `zcc add mode eng` (for engineer)

---

### Duplicate components in listings
**Problem**: Same component appears multiple times

**Solutions**:
1. Check for duplicates: `ls .zcc/modes/`
2. Remove duplicates manually
3. Reinitialize: `zcc init --force`

---

## Ticket Management Issues

### Ticket move requires --to flag
**Old syntax** (if you see this error):
```bash
zcc ticket move "name" --to in-progress
```

**New syntax** (after update):
```bash
zcc ticket move "name" in-progress
# Or use convenience commands:
zcc ticket start "name"
zcc ticket finish "name"
```

---

### Lost ticket context
**Problem**: Tickets exist but context not loading

**Solutions**:
1. Check ticket location: `ls .zcc/tickets/*/`
2. Load manually: `/ticket <name>`
3. Verify ticket content has context section
4. Check script permissions: `ls -la .zcc/scripts/ticket-context.sh`

---

## Performance Issues

### Slow initialization
**Problem**: `zcc init` takes too long

**Solutions**:
1. Use a specific pack: `zcc init --pack frontend-react`
2. Skip optional components initially
3. Check network connectivity for template downloads
4. Use local cache if available

---

### Large context in Claude Code
**Problem**: Too much context loaded, hitting limits

**Solutions**:
1. Use selective ticket loading
2. Archive old tickets: `mv .zcc/tickets/done/* .zcc/tickets/archive/`
3. Limit hook context with configuration

---

## Build and Development Issues

### Build failures
**Error**: `npm run build` fails

**Solutions**:
1. Check Node version: `node --version` (need 18+)
2. Clean and rebuild: `npm run clean && npm install && npm run build`
3. Check for TypeScript errors: `npx tsc --noEmit`

---

### Tests failing
**Error**: Test suite failures

**Solutions**:
1. Run specific test: `npm test -- <test-name>`
2. Update snapshots if needed: `npm test -- -u`
3. Check coverage: `npm run test:coverage`

---

## Getting More Help

### Diagnostic Commands
```bash
# Check installation
zcc --version
which zcc
npm list -g z-claude-code

# Check project state
zcc list --installed
zcc validate
ls -la .claude .zcc

# Check logs (if verbose mode)
zcc init --verbose --debug
```

### Debug Mode
Run any command with debug output:
```bash
zcc --debug <command>
```

### Still Stuck?
1. Check existing issues: [GitHub Issues](https://github.com/git-on-my-level/zcc/issues)
2. Create a new issue with:
   - Error message
   - Steps to reproduce
   - Output of `zcc --version`
   - Output of `node --version`
   - Your OS and shell

---

**Pro Tip**: Most issues can be resolved with:
```bash
zcc init --force --pack frontend-react
```