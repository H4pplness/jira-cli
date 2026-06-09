---
name: jira-cli
description: |
  Guide for AI agents using the jira-cli tool (`jira`) to operate Jira directly
  from the terminal. Use this skill whenever the user mentions Jira, even if
  they do not explicitly say "jira-cli". Trigger signals include:
  - Mentions of Jira issues, tasks, bugs, stories, epics, or sprints
  - Requests to search, view, create, edit, assign, or transition Jira issues/epics
  - Requests to add comments, change priority, set due dates, or log work in Jira
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
| `--assignee` | `me`, `user@email.com`, or display name | `me` = currentUser(); names are searched automatically |
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

The `--assignee` flag accepts email, display name, or `me`. The CLI automatically
searches Jira users and resolves to the correct account. If multiple matches are
found, the first match is used in non-interactive mode.

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

## 8. Log Work

```bash
jira issue log PROJ-123 --time "2h"
jira issue log PROJ-123 --time "1d 4h" --message "Implemented the feature"
jira issue log PROJ-123 --time "30m" --date 2025-12-15
```

| Flag | Example | Notes |
|---|---|---|
| `--time` | `"2h"`, `"30m"`, `"1d"`, `"3h 30m"` | Required. Jira time notation: w/d/h/m |
| `--message` | `"Did the work"` | Optional worklog comment |
| `--date` | `2025-12-15` | Optional start date (default: today) |

Always pass `--time` when running as an agent. Omitting it triggers an interactive
prompt.

---

## 9. View Worklogs

```bash
jira issue worklogs PROJ-123
```

Shows all worklog entries: author, time spent, start date, and comment.

---

## 10. Transition Issues

```bash
jira issue transition PROJ-123 --status "In Progress"
jira issue transition PROJ-123 --status "In Review"
jira issue transition PROJ-123 --status Done
```

The status name must match a valid transition in the project's workflow. Matching
is case-insensitive, but use the real Jira status name when possible.

---

## 11. Add Comments

```bash
jira issue comment PROJ-123 --message "Fixed, please review again."
jira issue comment PROJ-123 --message "Deployed to staging. Link: https://staging.example.com"
```

Always use `--message` when running as an agent. Omitting it opens an editor.

---

## 12. Epics In A Project

```bash
jira epic list --project PROJ
jira epic view PROJ-10        # epic details plus child issues
```

---

## 13. Projects

```bash
jira project list             # all accessible projects
jira project view PROJ        # project details
jira project issue-types PROJ # valid issue types for this project
```

---

## 14. Configuration

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
10. All commands output the real Jira URL (e.g. `https://company.atlassian.net/browse/PROJ-123`).
    Use these URLs when reporting results to the user — never fabricate URLs.
11. The `--assignee` flag accepts display names (e.g. `"Nguyen Van A"`) in addition
    to email. The CLI searches Jira and resolves the correct user automatically.

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

### Log 2 hours of work

```bash
jira issue log PROJ-42 --time "2h" --message "Implemented login flow"
```

### View worklogs

```bash
jira issue worklogs PROJ-42
```

### Assign by display name

```bash
jira issue edit PROJ-77 --assignee "Nguyen Van A"
```

### View current sprint issues

```bash
jira issue search --jql 'project = PROJ AND sprint in openSprints() ORDER BY priority DESC'
```
