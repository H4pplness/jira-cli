'use strict';

const chalk = require('chalk');
const Table = require('cli-table3');
const { colorStatus, colorPriority } = require('./table.renderer');
const { formatDate, formatDateTime } = require('../utils/date.util');
const { adfToText } = require('../utils/adf.util');

function renderIssueDetail(issue, { showComments = false } = {}) {
  const f = issue.fields;
  const line = '═'.repeat(70);

  console.log('\n' + chalk.bold.cyan(line));
  console.log(
    '  ' + chalk.bold.white(issue.key) +
    chalk.gray(` · ${f.issuetype?.name}`) +
    (f.parent ? chalk.gray(` · Parent: ${f.parent.key}`) : '')
  );
  console.log('  ' + chalk.bold.white(f.summary));
  console.log(chalk.bold.cyan(line));

  // Meta table (borderless)
  const meta = new Table({
    style: { border: [] },
    chars: { top:'',bottom:'',left:'',right:'',mid:'',middle:' ','top-mid':'','bottom-mid':'','left-mid':'','right-mid':'','mid-mid':'' },
  });
  meta.push(
    [chalk.gray('Project'),  `${f.project?.name} (${f.project?.key})`],
    [chalk.gray('Status'),   colorStatus(f.status?.name)],
    [chalk.gray('Priority'), colorPriority(f.priority?.name)],
    [chalk.gray('Assignee'), f.assignee ? f.assignee.displayName : chalk.gray('Unassigned')],
    [chalk.gray('Reporter'), f.reporter?.displayName || chalk.gray('—')],
    [chalk.gray('Due Date'), formatDate(f.duedate)],
    [chalk.gray('Created'),  formatDateTime(f.created)],
    [chalk.gray('Updated'),  formatDateTime(f.updated)],
  );
  if (f.labels?.length) meta.push([chalk.gray('Labels'), f.labels.map(l => chalk.cyan(l)).join(', ')]);
  console.log(meta.toString());

  // Description
  const desc = adfToText(f.description);
  if (desc) {
    console.log('\n' + chalk.bold('Description:'));
    console.log(chalk.gray('─'.repeat(70)));
    console.log(chalk.white(desc));
  }

  // Subtasks
  if (f.subtasks?.length) {
    console.log('\n' + chalk.bold('Subtasks:'));
    for (const s of f.subtasks) {
      console.log(`  ${chalk.cyan(s.key)} ${colorStatus(s.fields?.status?.name)} ${s.fields?.summary}`);
    }
  }

  // Comments
  if (showComments) {
    const comments = f.comment?.comments || [];
    console.log('\n' + chalk.bold(`Comments (${comments.length}):`));
    if (!comments.length) {
      console.log(chalk.gray('  Không có comment.'));
    } else {
      console.log(chalk.gray('─'.repeat(70)));
      for (const c of comments) {
        console.log(chalk.yellow(`@${c.author?.displayName}`) + chalk.gray(` · ${formatDateTime(c.created)}`));
        console.log(chalk.white(adfToText(c.body) || ''));
        console.log(chalk.gray('· · ·'));
      }
    }
  }
  console.log('');
}

module.exports = { renderIssueDetail };
