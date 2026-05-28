'use strict';

const { Command } = require('commander');
const ora = require('ora');
const chalk = require('chalk');
const projectService = require('../../services/project.service');
const { renderProjectTable, renderIssueTypeTable } = require('../../renderers/table.renderer');
const { handleError } = require('../../utils/error');

function buildProjectCommand() {
  const project = new Command('project');
  project.description('Xem thông tin Jira projects');

  project
    .command('list')
    .description('Liệt kê tất cả project bạn có quyền truy cập')
    .option('--context <name>')
    .action(async (opts) => {
      const spinner = ora('Đang tải projects...').start();
      try {
        const projects = await projectService.listProjects({ contextName: opts.context });
        spinner.stop();
        renderProjectTable(projects);
        console.log(chalk.gray(`  ${projects.length} project(s)`));
      } catch (err) { spinner.fail('Thất bại'); handleError(err); }
    });

  project
    .command('view <projectKey>')
    .description('Xem chi tiết một project')
    .option('--context <name>')
    .action(async (projectKey, opts) => {
      const spinner = ora(`Đang tải ${projectKey.toUpperCase()}...`).start();
      try {
        const p = await projectService.getProject(projectKey.toUpperCase(), { contextName: opts.context });
        spinner.stop();
        console.log('\n' + chalk.bold.cyan('═'.repeat(60)));
        console.log(`  ${chalk.bold.white(p.key)} — ${chalk.white(p.name)}`);
        console.log(chalk.bold.cyan('═'.repeat(60)));
        console.log(chalk.gray('  Type:        ') + (p.projectTypeKey || '—'));
        console.log(chalk.gray('  Lead:        ') + (p.lead?.displayName || '—'));
        console.log(chalk.gray('  Description: ') + (p.description || chalk.gray('(none)')));
        if (p.issueTypes?.length) {
          console.log(chalk.gray('  Issue types: ') + p.issueTypes.map(t => t.name).join(', '));
        }
        console.log('');
      } catch (err) { spinner.fail('Thất bại'); handleError(err); }
    });

  project
    .command('issue-types <projectKey>')
    .alias('issuetypes')
    .description('Liệt kê issue types hợp lệ trong một project')
    .option('--context <name>')
    .action(async (projectKey, opts) => {
      const key = projectKey.toUpperCase();
      const spinner = ora(`Đang tải issue types của ${key}...`).start();
      try {
        const p = await projectService.getProject(key, { contextName: opts.context });
        spinner.stop();
        console.log('\n' + chalk.bold.cyan(`${p.key} — ${p.name}`));
        renderIssueTypeTable(p.issueTypes || []);
      } catch (err) { spinner.fail('Thất bại'); handleError(err); }
    });

  return project;
}

module.exports = { buildProjectCommand };
