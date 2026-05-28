#!/usr/bin/env node
'use strict';

const { Command } = require('commander');
const chalk = require('chalk');
const { buildLoginCommand }   = require('../src/commands/login/login.command');
const { buildConfigCommand }  = require('../src/commands/config/config.command');
const { buildIssueCommand }   = require('../src/commands/issue/issue.command');
const { buildEpicCommand }    = require('../src/commands/epic/epic.command');
const { buildProjectCommand } = require('../src/commands/project/project.command');

const program = new Command();

program
  .name('jira')
  .description(chalk.cyan('Jira CLI') + chalk.gray(' — Atlassian shared config layer'))
  .version('2.0.0', '-v, --version')
  .addHelpText('after', `
${chalk.bold('Bắt đầu nhanh (một lệnh):')}
  ${chalk.gray('$')} jira login

${chalk.bold('Hoặc cấu hình thủ công (đa môi trường):')}
  ${chalk.gray('$')} jira config server add my-company --url https://company.atlassian.net --type cloud
  ${chalk.gray('$')} jira config credential add my-token --type basic
  ${chalk.gray('$')} jira config context add work --server my-company --credential my-token

${chalk.bold('Sử dụng hàng ngày:')}
  ${chalk.gray('$')} jira issue search --project PROJ --status "In Progress"
  ${chalk.gray('$')} jira issue view PROJ-123 --comments
  ${chalk.gray('$')} jira issue create --project PROJ --type Bug --summary "Login crash"
  ${chalk.gray('$')} jira issue transition PROJ-123 --status Done
  ${chalk.gray('$')} jira issue comment PROJ-123 -m "đã fix"
  ${chalk.gray('$')} jira epic list --project PROJ
  ${chalk.gray('$')} jira project list

${chalk.bold('Đa môi trường:')}
  ${chalk.gray('$')} jira issue search --context staging --project PROJ
`);

program.addCommand(buildLoginCommand());
program.addCommand(buildConfigCommand());
program.addCommand(buildIssueCommand());
program.addCommand(buildEpicCommand());
program.addCommand(buildProjectCommand());

program.on('command:*', (op) => {
  console.error(chalk.red(`✖ Lệnh không hợp lệ: ${op[0]}`));
  console.log(chalk.gray('Chạy "jira --help" để xem danh sách lệnh.'));
  process.exit(1);
});

program.parse(process.argv);
if (process.argv.length < 3) program.help();
