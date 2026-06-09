# jira-cli

A command-line Jira client for teams that work across one or more Atlassian environments. It stores Jira servers, credentials, and contexts locally, then lets you search, view, create, edit, comment on, and transition Jira issues from the terminal.

## Features

- Quick interactive login wizard.
- Multiple Jira contexts for different companies, projects, staging instances, or credentials.
- Jira Cloud and Jira Data Center/Server support.
- Basic auth with Atlassian email + API token, Personal Access Token, and OAuth2 access token configuration.
- Issue search with JQL or common filters.
- Issue view, create, edit, comment, and transition commands.
- Log work and view worklogs.
- Smart assignee search — accepts email, display name, or `me`.
- Real Jira URLs in all command output.
- Epic list, view, create, and edit commands.
- Project list and detail commands.

## Requirements

- Node.js 20 or newer.
- Access to a Jira Cloud, Data Center, or Server instance.
- A Jira API token, PAT, or OAuth2 access token.

## Install

Install globally from npm:

```sh
npm install -g @h4pplness/jira-cli
jira --help
```

For local development, install dependencies:

```sh
npm install
```

Run locally:

```sh
npm start -- --help
```

Link the CLI as `jira` on your machine:

```sh
npm link
jira --help
```

## Quick Start

Run the login wizard:

```sh
jira login
```

The wizard creates:

- a server entry,
- a credential entry,
- a context that joins the server and credential.

For Jira Cloud, choose `basic` authentication and use your Atlassian email with an API token from:

```txt
https://id.atlassian.com/manage-profile/security/api-tokens
```

For Jira Data Center/Server, choose `pat` and provide a Personal Access Token.

## Daily Usage

Search issues:

```sh
jira issue search --project PROJ --status "In Progress"
jira issue search "login error" --project PROJ --assignee me
jira issue search --jql 'project = "PROJ" AND status = "Done" ORDER BY updated DESC'
```

View an issue:

```sh
jira issue view PROJ-123
jira issue view PROJ-123 --comments
```

Create an issue:

```sh
jira issue create --project PROJ --type Bug --summary "Login crashes on invalid token"
```

Edit an issue:

```sh
jira issue edit PROJ-123 --summary "Updated summary"
jira issue edit PROJ-123 --assignee user@example.com --priority High --due 2026-06-30
jira issue edit PROJ-123 --assignee "Nguyen Van A"
```

Add a comment:

```sh
jira issue comment PROJ-123 --message "Fixed in the latest build."
```

Transition an issue:

```sh
jira issue transition PROJ-123 --status Done
```

Log work:

```sh
jira issue log PROJ-123 --time "2h"
jira issue log PROJ-123 --time "1d 4h" --message "Implemented the feature"
jira issue log PROJ-123 --time "30m" --date 2026-06-01
```

View worklogs:

```sh
jira issue worklogs PROJ-123
```

## Epics

List epics in a project:

```sh
jira epic list --project PROJ
```

View an epic and its child issues:

```sh
jira epic view PROJ-100
```

Create an epic:

```sh
jira epic create --project PROJ --summary "Billing migration"
jira epic create --project PROJ --summary "Billing migration" --description "Track billing work" --due 2026-07-31
```

Edit an epic:

```sh
jira epic edit PROJ-100 --summary "Billing migration phase 2" --due 2026-07-31
```

## Projects

List projects:

```sh
jira project list
```

View project details:

```sh
jira project view PROJ
```

List valid issue types for a project:

```sh
jira project issue-types PROJ
```

## Configuration

View all configuration:

```sh
jira config view
```

Show the active context:

```sh
jira config current
```

Create configuration manually:

```sh
jira config server add my-company --url https://company.atlassian.net --type cloud
jira config credential add my-token --type basic
jira config context add work --server my-company --credential my-token
```

Switch contexts:

```sh
jira config context list
jira config context use work
```

Run a command with a specific context:

```sh
jira issue search --context staging --project PROJ
jira project list --context work
```

Test contexts:

```sh
jira config context test
jira config context test work
jira config context test --all
```

## Local Data

Configuration is stored at:

```txt
~/.atlassian-cli/config.json
```

The file contains server URLs, context names, and credentials. Treat it as sensitive. The CLI writes the file with restricted permissions where supported by the operating system.

## Command Reference

```txt
jira login [--context <name>]

jira config view
jira config current
jira config server add <name> --url <url> --type <cloud|datacenter|server>
jira config server list
jira config server remove <name>
jira config server test <name>
jira config credential add <name> --type <basic|pat|oauth2>
jira config credential list
jira config credential remove <name>
jira config credential renew <name>
jira config context add <name> --server <name> --credential <name>
jira config context list
jira config context use <name>
jira config context remove <name>
jira config context test [name] [--all]

jira issue search [query] [--project <key>] [--assignee <email|name|me>] [--status <status>] [--type <type>] [--limit <n>] [--jql <jql>] [--context <name>]
jira issue view <issueKey> [--comments] [--context <name>]
jira issue create [--project <key>] [--type <type>] [--summary <text>] [--assignee <email|name|me>] [--parent <key>] [--context <name>]
jira issue edit <issueKey> [--summary <text>] [--assignee <email|name|me>] [--priority <priority>] [--due <date>] [--context <name>]
jira issue comment <issueKey> [--message <text>] [--context <name>]
jira issue transition <issueKey> [--status <status>] [--context <name>]
jira issue log <issueKey> [--time <timeSpent>] [--message <text>] [--date <YYYY-MM-DD>] [--context <name>]
jira issue worklogs <issueKey> [--context <name>]

jira epic list --project <key> [--limit <n>] [--context <name>]
jira epic view <epicKey> [--context <name>]
jira epic create [--project <key>] [--summary <text>] [--description <text>] [--due <date>] [--context <name>]
jira epic edit <epicKey> [--summary <text>] [--due <date>] [--context <name>]

jira project list [--context <name>]
jira project view <projectKey> [--context <name>]
jira project issue-types <projectKey> [--context <name>]

jira install-skill [--target <agents>] [--force]
```

## Install Skill for AI Agents

Install the Jira CLI skill so AI agents can use it automatically. Supported agents:

| Agent | Skill path |
|---|---|
| Claude Code | `~/.claude/commands/jira-cli.md` |
| Cursor | `~/.cursor/rules/jira-cli.mdc` |
| Windsurf | `~/.codeium/windsurf/memories/jira-cli.md` |
| OpenClaw | `~/.openclaw/workspace/skills/jira-cli/SKILL.md` |
| Roo Code | `~/.roo/rules/jira-cli.md` |

Interactive mode — auto-detects installed agents and lets you choose:

```sh
jira install-skill
```

Install to a specific agent:

```sh
jira install-skill --target claude
jira install-skill --target cursor
jira install-skill --target windsurf
```

Install to all agents at once:

```sh
jira install-skill --target all  # claude,cursor,windsurf,openclaw,roo
```

Update if already installed:

```sh
jira install-skill --target all --force
```

Once installed, the AI agent will recognize Jira-related requests and use jira-cli commands.

## Development

Run the CLI directly:

```sh
node bin/jira.js --help
```

Useful scripts:

```sh
npm start
npm run link
```
