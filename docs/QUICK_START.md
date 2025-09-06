# Quick Start Guide

Get up and running with zcc in 5 minutes! This guide covers the essentials.

## Prerequisites

- Node.js 18+ and npm
- A project using Claude Code
- Basic familiarity with command line

## Installation

### Method 1: npx (Recommended for trying out)
```bash
npx zcc init
```

### Method 2: Global Install (Recommended for regular use)
```bash
npm install -g z-claude-code
zcc init
```

### Method 3: Local Development
```bash
# If you're developing zcc itself
cd /path/to/zcc
npm run build
npm run dev init -- --force --pack frontend-react
```

## Your First 5 Minutes

### 1. Initialize zcc (30 seconds)
```bash
cd your-project
npx zcc init
```

You'll be prompted to select a **Starter Pack** - a curated bundle of modes, workflows, and agents that work together seamlessly:
- **essentials**: Core setup with fundamental modes and workflows for general development
- **frontend-react**: Complete React development setup with specialized components
- **advanced-code-refactoring**: AST-grep focused refactoring tools

**Tip**: Use arrow keys to navigate, `enter` to select a pack

### 2. Try Mode Switching (1 minute)
```bash
# In Claude Code, use the slash command:
/mode

# Or specify a mode:
/mode engineer
/mode architect
/mode reviewer

# Fuzzy matching works too:
/mode eng  # → engineer
/mode arc  # → architect
```

### 3. Create Your First Ticket (1 minute)
```bash
# Create a ticket for your current task
zcc ticket create "implement user authentication"

# Or in Claude Code:
/ticket create implement-auth

# Start working on it
zcc ticket start implement-auth

# View your tickets
zcc ticket list
```

### 4. Check Your Setup (30 seconds)
```bash
# See what's installed
zcc list

# Check project status in Claude Code
/zcc
```

### 5. Use Enhanced Claude Code (2 minutes)

Now when you chat with Claude Code:

```text
You: "I need to implement user authentication"
Claude: [Automatically loads your ticket context, project structure, and uses engineer mode]

You: "mode: reviewer"
Claude: [Switches to review mode with security focus]

You: "Review the auth implementation"
Claude: [Performs thorough security-focused review]
```

## Common Commands

### Essential CLI Commands
```bash
# Component Management
zcc add mode <name>           # Add a mode
zcc add workflow <name>       # Add a workflow
zcc add agent <name>         # Add an agent
zcc list                     # List all components
zcc list --installed         # Show only installed

# Ticket Management
zcc ticket create <name>     # Create new ticket
zcc ticket start <name>      # Move to in-progress
zcc ticket finish <name>     # Move to done
zcc ticket list             # Show all tickets

# Maintenance
zcc update                  # Update components
zcc validate                # Check component health
```

### Claude Code Commands
```bash
/mode [name]                # Switch AI personality
/ticket [name]              # Load ticket context
/zcc                       # Show project status
```

## Troubleshooting

### Issue: "zcc: command not found"
**Solution**: Use `npx zcc` or install globally with `npm install -g z-claude-code`

### Issue: "zcc is already initialized"
**Solution**: Use `--force` flag: `zcc init --force`

### Issue: Claude Code doesn't recognize commands
**Solution**: Restart Claude Code after running `zcc init`

### Issue: Permissions errors
**Solution**: Check that `.claude/settings.local.json` exists and has proper permissions

## Next Steps

- 📦 Try a [Starter Pack](STARTER_PACKS.md) for your project type
- 🎨 [Create custom modes](CUSTOM_MODES.md) for your team
- 🪝 Set up [Hooks](HOOKS_GUIDE.md) for automation
- 🤝 [Contribute](../CONTRIBUTING.md) your own components

## Getting Help

- **Documentation**: [Full docs](https://github.com/git-on-my-level/zcc#readme)
- **Issues**: [GitHub Issues](https://github.com/git-on-my-level/zcc/issues)
- **Community**: Coming soon!

---

**Pro Tips**: 
- For CI/CD or automated setups: `zcc init --pack frontend-react`
- For existing projects: `zcc init --force --pack essentials` 
- Interactive mode shows pack selection: `zcc init`