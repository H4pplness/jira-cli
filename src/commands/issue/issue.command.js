'use strict';

const { Command } = require('commander');
const inquirer = require('inquirer');
const ora = require('ora');
const chalk = require('chalk');
const issueService = require('../../services/issue.service');
const projectService = require('../../services/project.service');
const { renderIssueTable } = require('../../renderers/table.renderer');
const { renderIssueDetail } = require('../../renderers/issue.renderer');
const { buildJql } = require('../../utils/jql.builder');
const { handleError } = require('../../utils/error');

const PRIORITIES = ['Highest', 'High', 'Medium', 'Low', 'Lowest'];

// Shared --context option helper
function withContext(cmd) {
  return cmd.option('--context <name>', 'Dùng context cụ thể (mặc định: active context)');
}

function parseLabels(value) {
  if (!value) return undefined;
  if (Array.isArray(value)) return value;
  const labels = value.split(',').map(l => l.trim()).filter(Boolean);
  return labels.length ? labels : undefined;
}

function buildIssueCommand() {
  const issue = new Command('issue');
  issue.description('Quản lý Jira issues');

  // ── search ─────────────────────────────────────────────
  withContext(
    issue
      .command('search [query]')
      .description('Tìm kiếm issue theo JQL hoặc từ khóa')
      .option('-p, --project <key>', 'Filter theo project')
      .option('-a, --assignee <email>', 'Filter (me = currentUser())')
      .option('-s, --status <status>', 'Filter theo status')
      .option('-t, --type <type>', 'Filter theo loại issue')
      .option('-l, --limit <n>', 'Số kết quả', '20')
      .option('--jql <jql>', 'JQL tùy chỉnh (ưu tiên cao nhất)')
  ).action(async (query, opts) => {
    const spinner = ora('Đang tìm kiếm...').start();
    try {
      const jql = buildJql({ jql: opts.jql, project: opts.project, type: opts.type, status: opts.status, assignee: opts.assignee, query });
      const result = await issueService.searchIssues({ jql, limit: parseInt(opts.limit, 10), contextName: opts.context });
      spinner.stop();
      console.log(chalk.gray(`\n  JQL: ${jql}`));
      renderIssueTable(result.issues || []);
    } catch (err) { spinner.fail('Thất bại'); handleError(err); }
  });

  // ── view ───────────────────────────────────────────────
  withContext(
    issue
      .command('view <issueKey>')
      .description('Xem chi tiết issue')
      .option('-c, --comments', 'Hiển thị kèm comments')
  ).action(async (issueKey, opts) => {
    const spinner = ora(`Đang tải ${issueKey.toUpperCase()}...`).start();
    try {
      const data = await issueService.getIssue(issueKey.toUpperCase(), { contextName: opts.context });
      spinner.stop();
      renderIssueDetail(data, { showComments: !!opts.comments });
    } catch (err) { spinner.fail('Thất bại'); handleError(err); }
  });

  // ── create ─────────────────────────────────────────────
  withContext(
    issue
      .command('create')
      .description('Tạo issue mới')
      .option('-p, --project <key>', 'Project key')
      .option('-t, --type <type>', 'Loại issue')
      .option('-s, --summary <text>', 'Summary')
      .option('-d, --description <text>', 'Description')
      .option('--priority <priority>', `Priority (${PRIORITIES.join(', ')})`)
      .option('--assignee <email>', 'Assignee email')
      .option('--due <date>', 'Due date YYYY-MM-DD')
      .option('--labels <labels>', 'Labels, phân cách bằng dấu phẩy')
      .option('--parent <key>', 'Parent issue key (Sub-task)')
  ).action(async (opts) => {
    try {
      const hasRequiredFlags = opts.project && opts.type && opts.summary;
      const questions = [];

      if (!hasRequiredFlags) {
        if (!opts.project) {
          let choices = [];
          try {
            const projects = await projectService.listProjects({ contextName: opts.context });
            choices = projects.map(p => ({ name: `${p.key} — ${p.name}`, value: p.key }));
          } catch {}
          questions.push(choices.length
            ? { type: 'list',  name: 'projectKey', message: 'Project:', choices }
            : { type: 'input', name: 'projectKey', message: 'Project key:', filter: v => v.trim().toUpperCase() }
          );
        }

        if (!opts.type) {
          questions.push({ type: 'list', name: 'issueType', message: 'Loại issue:', choices: ['Task','Story','Bug','Sub-task','Epic'], default: 'Task' });
        }
        if (!opts.summary) {
          questions.push({ type: 'input', name: 'summary', message: 'Summary:', validate: v => v.trim() ? true : 'Không được để trống', filter: v => v.trim() });
        }

        questions.push(
          { type: 'editor', name: 'description', message: 'Description (Enter để mở editor):', default: opts.description || '' },
          { type: 'list',   name: 'priority',    message: 'Priority:', choices: ['(bỏ qua)', ...PRIORITIES], default: opts.priority || '(bỏ qua)' },
          { type: 'input',  name: 'assignee',    message: 'Assignee email (để trống để bỏ qua):', default: opts.assignee || '', filter: v => v.trim() },
          { type: 'input',  name: 'dueDate',     message: 'Due date YYYY-MM-DD (để trống để bỏ qua):', default: opts.due || '', validate: v => !v || /^\d{4}-\d{2}-\d{2}$/.test(v) ? true : 'Format: YYYY-MM-DD', filter: v => v.trim() },
          { type: 'input',  name: 'labels',      message: 'Labels (phân cách dấu phẩy):', default: opts.labels || '', filter: v => parseLabels(v) || [] },
        );
      }

      const ans = questions.length ? await inquirer.prompt(questions) : {};
      const spinner = ora('Đang tạo issue...').start();
      const priority = opts.priority || ans.priority;

      const result = await issueService.createIssue({
        projectKey:  opts.project  || ans.projectKey,
        issueType:   opts.type     || ans.issueType,
        summary:     opts.summary  || ans.summary,
        description: (opts.description || ans.description)?.trim() || undefined,
        priority:    priority === '(bỏ qua)' ? undefined : priority,
        assignee:    opts.assignee || ans.assignee || undefined,
        dueDate:     opts.due || ans.dueDate || undefined,
        labels:      parseLabels(opts.labels) || parseLabels(ans.labels),
        parentKey:   opts.parent?.toUpperCase(),
        contextName: opts.context,
      });

      spinner.succeed(`Issue đã tạo: ${chalk.bold.cyan(result.key)}`);
    } catch (err) { handleError(err); }
  });

  // ── edit ───────────────────────────────────────────────
  withContext(
    issue
      .command('edit <issueKey>')
      .description('Chỉnh sửa issue')
      .option('--summary <text>')
      .option('--assignee <email>')
      .option('--priority <priority>')
      .option('--due <date>', 'YYYY-MM-DD')
  ).action(async (issueKey, opts) => {
    const key = issueKey.toUpperCase();
    try {
      const hasFlags = opts.summary || opts.assignee || opts.priority || opts.due;

      if (hasFlags) {
        const updates = {};
        if (opts.summary)  updates.summary  = opts.summary;
        if (opts.assignee) updates.assignee = opts.assignee;
        if (opts.priority) updates.priority = opts.priority;
        if (opts.due)      updates.dueDate  = opts.due;
        const spinner = ora(`Đang cập nhật ${key}...`).start();
        await issueService.updateIssue(key, updates, { contextName: opts.context });
        spinner.succeed(`Đã cập nhật ${chalk.bold.cyan(key)}`);
        return;
      }

      // Interactive
      const spinner = ora(`Đang tải ${key}...`).start();
      const existing = await issueService.getIssue(key, { contextName: opts.context });
      spinner.stop();
      const f = existing.fields;

      console.log(chalk.cyan(`\nChỉnh sửa: ${key} — ${f.summary}\n`));
      const ans = await inquirer.prompt([
        { type: 'input', name: 'summary',  message: 'Summary:',  default: f.summary, filter: v => v.trim() },
        { type: 'list',  name: 'priority', message: 'Priority:', choices: PRIORITIES, default: f.priority?.name || 'Medium' },
        { type: 'input', name: 'assignee', message: 'Assignee email:', default: f.assignee?.emailAddress || '', filter: v => v.trim() },
        { type: 'input', name: 'dueDate',  message: 'Due date (YYYY-MM-DD):', default: f.duedate || '', validate: v => !v || /^\d{4}-\d{2}-\d{2}$/.test(v) ? true : 'Format: YYYY-MM-DD', filter: v => v.trim() },
        { type: 'input', name: 'labels',   message: 'Labels (phân cách dấu phẩy):', default: (f.labels||[]).join(', '), filter: v => v.trim() ? v.split(',').map(l => l.trim()).filter(Boolean) : [] },
      ]);

      const saveSpinner = ora('Đang lưu...').start();
      await issueService.updateIssue(key, ans, { contextName: opts.context });
      saveSpinner.succeed(`Đã cập nhật ${chalk.bold.cyan(key)}`);
    } catch (err) { handleError(err); }
  });

  // ── comment ────────────────────────────────────────────
  withContext(
    issue
      .command('comment <issueKey>')
      .description('Thêm comment vào issue')
      .option('-m, --message <text>', 'Nội dung comment')
  ).action(async (issueKey, opts) => {
    const key = issueKey.toUpperCase();
    try {
      let message = opts.message;
      if (!message) {
        const { text } = await inquirer.prompt([{ type: 'editor', name: 'text', message: `Comment cho ${key}:` }]);
        message = text?.trim();
      }
      if (!message) { console.error(chalk.red('✖ Comment không được để trống.')); process.exit(1); }

      const spinner = ora('Đang thêm comment...').start();
      await issueService.addComment(key, message, { contextName: opts.context });
      spinner.succeed(`Đã thêm comment vào ${chalk.bold.cyan(key)}`);
    } catch (err) { handleError(err); }
  });

  // ── transition ─────────────────────────────────────────
  withContext(
    issue
      .command('transition <issueKey>')
      .description('Chuyển trạng thái issue')
      .option('-s, --status <status>', 'Tên status đích')
  ).action(async (issueKey, opts) => {
    const key = issueKey.toUpperCase();
    try {
      const spinner = ora('Đang tải transitions...').start();
      const transitions = await issueService.getTransitions(key, { contextName: opts.context });
      spinner.stop();

      if (!transitions.length) { console.error(chalk.red('✖ Không có transition khả dụng.')); process.exit(1); }

      let target;
      if (opts.status) {
        target = transitions.find(t => t.name.toLowerCase() === opts.status.toLowerCase() || t.to?.name?.toLowerCase() === opts.status.toLowerCase());
        if (!target) {
          console.error(chalk.red(`✖ Không tìm thấy transition "${opts.status}"`));
          console.log(chalk.gray('Có sẵn: ' + transitions.map(t => `${t.name} → ${t.to?.name}`).join(', ')));
          process.exit(1);
        }
      } else {
        const { chosen } = await inquirer.prompt([{
          type: 'list', name: 'chosen', message: `Transition cho ${key}:`,
          choices: transitions.map(t => ({ name: `${t.name} → ${t.to?.name}`, value: t })),
        }]);
        target = chosen;
      }

      const doSpinner = ora(`Chuyển sang "${target.to?.name}"...`).start();
      await issueService.doTransition(key, target.id, { contextName: opts.context });
      doSpinner.succeed(`${chalk.bold.cyan(key)} → ${chalk.green(target.to?.name || target.name)}`);
    } catch (err) { handleError(err); }
  });

  return issue;
}

module.exports = { buildIssueCommand };
