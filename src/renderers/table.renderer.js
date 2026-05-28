'use strict';

const chalk = require('chalk');
const Table = require('cli-table3');
const { formatDate } = require('../utils/date.util');

const STATUS_COLOR = {
  'To Do': chalk.gray, 'In Progress': chalk.blue, 'In Review': chalk.yellow,
  'Done': chalk.green, 'Closed': chalk.green, 'Cancelled': chalk.red, 'Blocked': chalk.red,
};
const PRIORITY_COLOR = {
  Highest: chalk.red.bold, High: chalk.red, Medium: chalk.yellow, Low: chalk.blue, Lowest: chalk.gray,
};

function colorStatus(s)   { return (STATUS_COLOR[s]   || chalk.white)(s || '—'); }
function colorPriority(p) { return (PRIORITY_COLOR[p] || chalk.white)(p || '—'); }

function renderIssueTable(issues) {
  if (!issues?.length) { console.log(chalk.yellow('Không tìm thấy issue nào.')); return; }

  const t = new Table({
    head: ['Key','Type','Summary','Status','Priority','Assignee','Due'].map(h => chalk.cyan(h)),
    colWidths: [14,10,44,14,10,22,12],
    wordWrap: true,
    style: { border: ['gray'] },
  });

  for (const i of issues) {
    const f = i.fields;
    t.push([
      chalk.bold(i.key),
      f.issuetype?.name || '—',
      f.summary || '—',
      colorStatus(f.status?.name),
      colorPriority(f.priority?.name),
      f.assignee?.displayName || chalk.gray('Unassigned'),
      formatDate(f.duedate),
    ]);
  }
  console.log(t.toString());
  console.log(chalk.gray(`  ${issues.length} issue(s)`));
}

function renderProjectTable(projects) {
  if (!projects?.length) { console.log(chalk.yellow('Không tìm thấy project nào.')); return; }

  const t = new Table({
    head: ['Key','Name','Type','Lead'].map(h => chalk.cyan(h)),
    colWidths: [12,40,14,30],
    wordWrap: true,
    style: { border: ['gray'] },
  });
  for (const p of projects) {
    t.push([chalk.bold(p.key), p.name, p.projectTypeKey || '—', p.lead?.displayName || '—']);
  }
  console.log(t.toString());
}

function renderIssueTypeTable(issueTypes) {
  if (!issueTypes?.length) { console.log(chalk.yellow('Không tìm thấy issue type nào.')); return; }

  const t = new Table({
    head: ['Name','ID','Sub-task','Description'].map(h => chalk.cyan(h)),
    colWidths: [22,12,10,50],
    wordWrap: true,
    style: { border: ['gray'] },
  });

  for (const type of issueTypes) {
    t.push([
      chalk.bold(type.name || '—'),
      type.id || '—',
      type.subtask ? chalk.yellow('yes') : chalk.gray('no'),
      type.description || '—',
    ]);
  }
  console.log(t.toString());
  console.log(chalk.gray(`  ${issueTypes.length} issue type(s)`));
}

module.exports = { renderIssueTable, renderProjectTable, renderIssueTypeTable, colorStatus, colorPriority };
