---
name: jira-cli
description: |
  Guide for AI agents using the jira-cli tool (`jira`) to operate Jira directly
  from the terminal. Use this skill whenever the user mentions Jira, even if
  they do not explicitly say "jira-cli". Trigger signals include:
  - Mentions of Jira issues, tasks, bugs, stories, epics, or sprints
  - Requests to search, view, create, edit, assign, or transition Jira issues/epics
  - Requests to add comments, change priority, or set due dates in Jira
  - Requests to list projects or inspect project details
  - Any Jira-related workflow such as "show my tasks today", "create a bug for
    this error", "move this ticket to Done", or "assign this issue to someone"
  This is an important skill. Prefer using it as soon as there is any Jira signal;
  the user does not need to explicitly ask for jira-cli.
---

# Jira CLI Skill

Use the `jira` command to interact with Jira Cloud or Jira Data Center/Server
directly from the terminal. Prefer non-interactive commands with explicit flags
when acting as an agent.

---

## 0. Preflight Check

```bash
jira config current   # show the active context
```

If there is no active context, ask the user to run:

```bash
jira login
```

---

## 1. Login

```bash
jira login                    # single login wizard: Jira type -> auth -> context
jira login --context staging  # add another environment
```

Always use `jira login` for authentication and environment setup. Do not create
servers, credentials, and contexts manually as a separate login flow unless the
user explicitly asks to manage config internals.

The login wizard supports both Jira Cloud and self-hosted Jira. It asks for:
- **Host URL**: for example `https://company.atlassian.net`
- **Jira type**: Cloud or Data Center/Server
- **Auth**: Basic (email + API token) or PAT
- **Context name**: for example `default`, `staging`, `work`

Recommended combinations:
- **Jira Cloud**: Basic auth with Atlassian email + API token
- **Self-hosted Jira Data Center/Server**: PAT when available, or Basic if the
  instance supports it

---

## 2. Search Issues

```bash
# Keyword search
jira issue search "login bug"

# Single filters
jira issue search --project PROJ
jira issue search --assignee me
jira issue search --status "In Progress"
jira issue search --type Bug

# Combined filters
jira issue search --project PROJ --assignee me --type Bug --limit 30

# Custom JQL. This has the highest priority and ignores other filters.
jira issue search --jql 'project = PROJ AND sprint in openSprints() ORDER BY priority DESC'
jira issue search --jql 'assignee = currentUser() AND status != Done ORDER BY updated DESC'
```

| Flag | Example | Notes |
|---|---|---|
| `--project` | `PROJ` | Project key |
| `--assignee` | `me` or `user@email.com` | `me` becomes `currentUser()` |
| `--status` | `"In Progress"` | Quote values with spaces |
| `--type` | `Bug`, `Story`, `Task`, `Epic` | Must be valid for the project |
| `--limit` | `50` | Default is 20 |
| `--jql` | JQL string | Highest priority |
| `--context` | `staging` | Override the active context |

---

## 3. View Issue Details

```bash
jira issue view PROJ-123              # basic issue details
jira issue view PROJ-123 --comments   # include comments
```

Output includes summary, status, priority, assignee, reporter, due date,
description, subtasks, labels, and comment thread when `--comments` is used.

---

## 4. Create Issues

If you are not sure which issue types are valid for a project, check first:

```bash
jira project issue-types PROJ
```

Use required flags to avoid interactive prompts:

```bash
jira issue create --project PROJ --type Task --summary "Task title"
jira issue create --project PROJ --type Bug --summary "Login crashes when using OAuth"
jira issue create --project PROJ --type Story --summary "User can reset password"
jira issue create --project PROJ --type Sub-task --summary "Write unit tests" --parent PROJ-10
```

Optional fields can be passed in the same command:

```bash
jira issue create --project PROJ --type Task --summary "Build API" \
  --description "Implementation details" \
  --priority High \
  --assignee dev@company.com \
  --due 2025-12-31 \
  --labels backend,api
```

Important: always pass `--project`, `--type`, and `--summary` when running as an
agent. Missing required flags trigger interactive prompts.

---

## 5. Create Epics

```bash
jira epic create --project PROJ --summary "Q4 epic"
jira epic create --project PROJ --summary "Q4 epic" --description "Epic details" --due 2025-12-31
```

Always pass `--project` and `--summary` when running as an agent. Missing required
flags trigger interactive prompts.

---

## 6. Edit Issues

```bash
jira issue edit PROJ-123 --summary "New title"
jira issue edit PROJ-123 --assignee dev@company.com
jira issue edit PROJ-123 --priority High
jira issue edit PROJ-123 --due 2025-12-31
jira issue edit PROJ-123 --priority High --assignee dev@company.com --due 2025-12-31
```

Valid priorities: `Highest`, `High`, `Medium`, `Low`, `Lowest`

Date format: `YYYY-MM-DD`

---

## 7. Edit Epics

```bash
jira epic edit PROJ-10 --summary "New epic name"
jira epic edit PROJ-10 --due 2025-12-31
jira epic edit PROJ-10 --summary "New name" --due 2025-12-31
```

---

## 8. Transition Issues

```bash
jira issue transition PROJ-123 --status "In Progress"
jira issue transition PROJ-123 --status "In Review"
jira issue transition PROJ-123 --status Done
```

The status name must match a valid transition in the project's workflow. Matching
is case-insensitive, but use the real Jira status name when possible.

---

## 9. Add Comments

```bash
jira issue comment PROJ-123 --message "Fixed, please review again."
jira issue comment PROJ-123 --message "Deployed to staging. Link: https://staging.example.com"
```

Always use `--message` when running as an agent. Omitting it opens an editor.

---

## 10. Epics In A Project

```bash
jira epic list --project PROJ
jira epic view PROJ-10        # epic details plus child issues
```

---

## 11. Projects

```bash
jira project list             # all accessible projects
jira project view PROJ        # project details
jira project issue-types PROJ # valid issue types for this project
```

---

## 12. Configuration

Use config commands for inspection, switching contexts, testing connections, and
renewing credentials. For new login/setup, use `jira login`.

```bash
# Inspect config
jira config view
jira config current

# Credential maintenance
jira config credential renew my-token

# Context switching/testing
jira config context list
jira config context use staging
jira config context test
jira config context test --all
```

---

## Agent Rules

1. Use flags and avoid interactive prompts whenever possible.
2. Use uppercase issue keys: `PROJ-123`, not `proj-123`.
3. Quote values with spaces: `--status "In Progress"`, `--summary "Has spaces"`.
4. Save newly created issue keys from command output for later steps.
5. For 401/403 errors, ask the user to run `jira config credential renew <name>`.
6. For "no active context" errors, ask the user to run `jira login`.
7. Use `--context <name>` for multi-environment workflows.
8. If the issue type is uncertain, run `jira project issue-types <PROJECT>` before creating an issue.
9. Use `jira login` as the only standard login/setup flow. It covers Jira Cloud,
   self-hosted Jira, Basic auth, and PAT.

---

## Practical Workflows

### Find my open bugs in PROJ

```bash
jira issue search --project PROJ --type Bug --assignee me --status "To Do"
```

### Create a bug

```bash
jira issue create --project PROJ --type Bug --summary "Confirmation email is not sent"
```

### Move an issue to Done

```bash
jira issue transition PROJ-99 --status Done
```

### Assign an issue, set priority, and set due date

```bash
jira issue edit PROJ-77 --assignee nam@company.com --priority High --due 2025-12-31
```

### Comment that a deployment is ready for QA

```bash
jira issue comment PROJ-50 --message "Deployed to staging. QA can verify before merge."
```

### View current sprint issues

```bash
jira issue search --jql 'project = PROJ AND sprint in openSprints() ORDER BY priority DESC'
```
