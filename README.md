# Claude Code OAuth Refresh

A credential refresh tool for Claude CLI on GitHub Actions self-hosted runners. Reads local Claude CLI credentials and converts them to a format usable by GitHub Actions.

## Overview

This tool automatically updates Claude CLI credentials stored locally for use with Claude API in GitHub Actions running on self-hosted runners.

## Prerequisites

- **Bun** installed
- **Claude CLI** installed and authenticated
- `~/.claude/.credentials.json` file exists
- GitHub Actions **self-hosted runner** environment

## Installation

```bash
# Clone the repository
git clone https://github.com/your-username/claude-code-oauth-refresh.git
cd claude-code-oauth-refresh

# Install dependencies
bun install
```

## Usage

```bash
# Update credentials
bun run index.ts

# Show help
bun run index.ts --help
```

The tool performs the following steps:

1. Checks if `claude` command is installed
2. Verifies `~/.claude/.credentials.json` exists
3. Checks credential expiration status
   - If expired: Prompts user to run `claude` manually to refresh
   - If valid: Shows remaining validity period
4. Reads the credentials
5. Saves them in GitHub Actions format to `credentials.json`

**Note**: Due to the interactive nature of the Claude CLI, automatic credential refresh is not possible. Users must manually run `claude` when credentials expire.

## GitHub Actions Self-hosted Runner Examples

### Using as a GitHub Action

The easiest way to use this tool is as a GitHub Action:

```yaml
name: Update Claude Credentials

on:
  workflow_dispatch:
  schedule:
    - cron: '0 3 * * *'  # Daily at 3 AM UTC

permissions:
  actions: write
  contents: read

jobs:
  update:
    runs-on: self-hosted
    steps:
      - uses: sskmy1024y/claude-code-oauth-refresh@main
        with:
          secrets_admin_pat: ${{ secrets.SECRETS_ADMIN_PAT }}  # Optional: for auto-updating secrets
```

#### Action Inputs

| Input | Description | Required | Default |
|-------|-------------|----------|---------|
| `secrets_admin_pat` | Personal Access Token with `secrets:write` permission for updating repository secrets | No | `''` |

#### Action Outputs

| Output | Description |
|--------|-------------|
| `success` | Whether the update was successful (`true`/`false`) |
| `expires_at` | Token expiration timestamp in milliseconds |

### Using Updated Credentials

```yaml
name: Claude Oauth Refresh

on:
  workflow_dispatch:
  schedule:
    - cron: '0 3,15 * * *'  # Twice daily at 3 AM and 3 PM UTC

permissions:
  actions: write
  contents: read

jobs:
  auth-refresh:
    runs-on: self-hosted
    steps:
      steps:
      - uses: sskmy1024/claude-code-auth-refresh@main
        with:
          secrets_admin_pat: ${{ secrets.SECRETS_ADMIN_PAT }}
```

## Development

### Running Tests

```bash
# Run tests
bun test

# Run tests in watch mode
bun test:watch
```

### Type Checking

```bash
bunx tsc --noEmit
```

## File Structure

- `index.ts` - Main implementation
- `index.test.ts` - Test suite
- `CLAUDE.md` - Development guidelines for Claude Code

## Important Notes

- This tool is **exclusively for self-hosted runners**
- Claude CLI must be installed and authenticated
- Credential files contain sensitive information and should be handled securely
- Only works on self-hosted runners, not GitHub-hosted runners

## Troubleshooting

### "Error: claude command is not installed"
Claude CLI is not installed. Please install [Claude CLI](https://claude.ai/code).

### "Error: Claude credentials file not found"
Claude CLI authentication is not complete. Run `claude login`.

### "Error: Failed to execute claude command"
Claude CLI command execution failed. Verify that `claude -p "! pwd"` can be executed manually.

## License

MIT

---

This project was created using `bun init` in bun v1.2.17. [Bun](https://bun.sh) is a fast all-in-one JavaScript runtime.
