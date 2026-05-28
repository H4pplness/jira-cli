'use strict';

const { Command } = require('commander');
const inquirer = require('inquirer');
const ora = require('ora');
const chalk = require('chalk');
const issueService = require('../../services/issue.service');
const projectService = require('../../services/project.service');
const { renderIssueTable } = require('../../renderers/table.renderer');
const { renderIssueDetail } = require('../../renderers/issue.renderer');
const { handleError } = require('../../utils/error');

function withContext(cmd) {
  return cmd.option('--context <name>', 'Dùng context cụ thể');
}

function buildEpicCommand() {
  const epic = new Command('epic');
  epic.description('Quản lý Jira epics');

  withContext(
    epic.command('list').description('Liệt kê epics trong project').option('-p, --project <key>', 'Project key (bắt buộc)').option('-l, --limit <n>', 'Số kết quả', '30')
  ).action(async (opts) => {
    if (!opts.project) { console.error(chalk.red('✖ Cần --project <key>')); process.exit(1); }
    const spinner = ora('Đang tải epics...').start();
    try {
      const result = await issueService.searchIssues({ jql: `project = "${opts.project}" AND issuetype = Epic ORDER BY created DESC`, limit: parseInt(opts.limit, 10), contextName: opts.context });
      spinner.stop();
      renderIssueTable(result.issues || []);
    } catch (err) { spinner.fail('Thất bại'); handleError(err); }
  });

  withContext(
    epic.command('view <epicKey>').description('Xem chi tiết epic + issues con')
  ).action(async (epicKey, opts) => {
    const key = epicKey.toUpperCase();
    const spinner = ora(`Đang tải ${key}...`).start();
    try {
      const [epicData, childResult] = await Promise.all([
        issueService.getIssue(key, { contextName: opts.context }),
        issueService.searchIssues({ jql: `"Epic Link" = ${key} OR parent = ${key} ORDER BY created ASC`, limit: 50, contextName: opts.context }),
      ]);
      spinner.stop();
      renderIssueDetail(epicData);
      const children = childResult.issues || [];
      console.log(chalk.bold(`Issues trong epic (${children.length}):`));
      if (children.length) renderIssueTable(children);
      else console.log(chalk.gray('  Không có issue nào.'));
    } catch (err) { spinner.fail('Thất bại'); handleError(err); }
  });

  withContext(
    epic
      .command('create')
      .description('Tạo epic mới')
      .option('-p, --project <key>')
      .option('-s, --summary <text>')
      .option('-d, --description <text>', 'Description')
      .option('--due <date>', 'Due date YYYY-MM-DD')
  ).action(async (opts) => {
    try {
      const hasRequiredFlags = opts.project && opts.summary;
      const questions = [];

      if (!hasRequiredFlags) {
        if (!opts.project) {
          let choices = [];
          try { const ps = await projectService.listProjects({ contextName: opts.context }); choices = ps.map(p => ({ name: `${p.key} — ${p.name}`, value: p.key })); } catch {}
          questions.push(choices.length
            ? { type: 'list',  name: 'projectKey', message: 'Project:', choices }
            : { type: 'input', name: 'projectKey', message: 'Project key:', filter: v => v.trim().toUpperCase() }
          );
        }
        if (!opts.summary) {
          questions.push({ type: 'input', name: 'summary', message: 'Epic name:', validate: v => v.trim() ? true : 'Không được để trống', filter: v => v.trim() });
        }
        questions.push(
          { type: 'editor', name: 'description', message: 'Description:', default: opts.description || '' },
          { type: 'input',  name: 'dueDate', message: 'Due date YYYY-MM-DD (để trống để bỏ qua):', default: opts.due || '', validate: v => !v || /^\d{4}-\d{2}-\d{2}$/.test(v) ? true : 'Format: YYYY-MM-DD', filter: v => v.trim() },
        );
      }

      const ans = questions.length ? await inquirer.prompt(questions) : {};
      const spinner = ora('Đang tạo epic...').start();
      const result = await issueService.createIssue({
        projectKey:  opts.project || ans.projectKey,
        summary:     opts.summary || ans.summary,
        issueType:   'Epic',
        description: (opts.description || ans.description)?.trim() || undefined,
        dueDate:     opts.due || ans.dueDate || undefined,
        contextName: opts.context,
      });
      spinner.succeed(`Epic đã tạo: ${chalk.bold.cyan(result.key)}`);
    } catch (err) { handleError(err); }
  });

  withContext(
    epic.command('edit <epicKey>').description('Chỉnh sửa epic').option('--summary <text>').option('--due <date>')
  ).action(async (epicKey, opts) => {
    const key = epicKey.toUpperCase();
    try {
      if (opts.summary || opts.due) {
        const updates = {};
        if (opts.summary) updates.summary = opts.summary;
        if (opts.due)     updates.dueDate = opts.due;
        const spinner = ora(`Đang cập nhật ${key}...`).start();
        await issueService.updateIssue(key, updates, { contextName: opts.context });
        spinner.succeed(`Đã cập nhật ${chalk.bold.cyan(key)}`);
        return;
      }
      const spinner = ora(`Đang tải ${key}...`).start();
      const epicData = await issueService.getIssue(key, { contextName: opts.context });
      spinner.stop();
      const f = epicData.fields;
      const ans = await inquirer.prompt([
        { type: 'input', name: 'summary', message: 'Epic name:', default: f.summary, filter: v => v.trim() },
        { type: 'input', name: 'dueDate', message: 'Due date (YYYY-MM-DD):', default: f.duedate || '', validate: v => !v || /^\d{4}-\d{2}-\d{2}$/.test(v) ? true : 'Format: YYYY-MM-DD', filter: v => v.trim() },
      ]);
      const saveSpinner = ora('Đang lưu...').start();
      await issueService.updateIssue(key, { summary: ans.summary, dueDate: ans.dueDate || undefined }, { contextName: opts.context });
      saveSpinner.succeed(`Đã cập nhật ${chalk.bold.cyan(key)}`);
    } catch (err) { handleError(err); }
  });

  return epic;
}

module.exports = { buildEpicCommand };
