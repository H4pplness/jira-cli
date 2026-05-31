'use strict';

const { Command } = require('commander');
const inquirer = require('inquirer');
const ora = require('ora');
const chalk = require('chalk');
const cfg = require('../../config');
const { testConnection } = require('../../services/jira.client');
const { handleError } = require('../../utils/error');

function buildLoginCommand() {
  const login = new Command('login');
  login
    .description('Đăng nhập nhanh — tạo server + credential + context chỉ trong một bước')
    .option('--context <name>', 'Tên context sẽ tạo (mặc định: "default")')
    .action(async (opts) => {
      console.log(chalk.cyan('\n🔐 Jira CLI — Đăng nhập\n'));
      console.log(chalk.gray(
        'Wizard này sẽ tạo server, credential và context trong một bước.\n' +
        'Bạn có thể quản lý chi tiết hơn sau với: jira config server|credential|context\n'
      ));

      // Step 1: Server
      console.log(chalk.bold.cyan('① Server'));
      const serverAnswers = await inquirer.prompt([
        {
          type: 'input',
          name: 'url',
          message: 'Jira host URL (vd: https://company.atlassian.net):',
          validate: v => v.trim().startsWith('http') ? true : 'URL phải bắt đầu bằng http(s)://',
          filter: v => v.trim().replace(/\/$/, ''),
        },
        {
          type: 'list',
          name: 'deployType',
          message: 'Loại deployment:',
          choices: [
            { name: 'Cloud (atlassian.net)', value: 'cloud' },
            { name: 'Data Center / Server (tự host)', value: 'datacenter' },
          ],
          default: 'cloud',
        },
      ]);

      // Step 2: Auth
      console.log('\n' + chalk.bold.cyan('② Xác thực'));
      const { authType } = await inquirer.prompt([{
        type: 'list',
        name: 'authType',
        message: 'Phương thức xác thực:',
        choices: [
          { name: 'Basic — Email/username + password/API token', value: 'basic' },
          { name: 'PAT   — Personal Access Token', value: 'pat' },
        ],
        default: serverAnswers.deployType === 'cloud' ? 'basic' : 'pat',
      }]);

      let credData;
      if (authType === 'basic') {
        const isCloud = serverAnswers.deployType === 'cloud';
        console.log(chalk.gray(
          isCloud
            ? '\nTạo API Token tại:\n' +
              chalk.underline('https://id.atlassian.com/manage-profile/security/api-tokens') + '\n'
            : '\nDùng username/email và password hoặc token nếu Jira tự host của bạn hỗ trợ Basic auth.\n'
        ));
        const ans = await inquirer.prompt([
          {
            type: 'input',
            name: 'username',
            message: isCloud ? 'Email Atlassian:' : 'Username hoặc email:',
            validate: v => v.trim() ? true : 'Không được để trống',
            filter: v => v.trim(),
          },
          {
            type: 'password',
            name: 'secret',
            message: isCloud ? 'API Token:' : 'Password hoặc token:',
            mask: '*',
            validate: v => v.trim() ? true : 'Không được để trống',
            filter: v => v.trim(),
          },
        ]);
        credData = { type: 'basic', username: ans.username, secret: ans.secret };
      } else {
        console.log(chalk.gray('\nTạo PAT tại: Settings → Personal Access Tokens\n'));
        const { token } = await inquirer.prompt([{
          type: 'password',
          name: 'token',
          message: 'Personal Access Token:',
          mask: '*',
          validate: v => v.trim() ? true : 'Không được để trống',
          filter: v => v.trim(),
        }]);
        credData = { type: 'pat', token };
      }

      // Step 3: Context name
      console.log('\n' + chalk.bold.cyan('③ Context'));
      const { contextName } = await inquirer.prompt([{
        type: 'input',
        name: 'contextName',
        message: 'Tên context (để nhận diện môi trường này):',
        default: opts.context || 'default',
        validate: v => v.trim() ? true : 'Không được để trống',
        filter: v => v.trim(),
      }]);

      // Save & test
      const serverName = `${contextName}-server`;
      const credName   = `${contextName}-credential`;

      const spinner = ora('Đang lưu và kiểm tra kết nối...').start();
      try {
        cfg.addServer(serverName, { url: serverAnswers.url, deployType: serverAnswers.deployType });
        cfg.addCredential(credName, credData);
        cfg.addContext(contextName, { serverName, credentialName: credName });

        const user = await testConnection(contextName);
        spinner.succeed(chalk.green('Kết nối thành công!'));

        console.log('');
        console.log(chalk.gray('  Host:    ') + chalk.white(serverAnswers.url));
        console.log(chalk.gray('  User:    ') + chalk.white(user.displayName));
        console.log(chalk.gray('  Email:   ') + chalk.white(user.emailAddress));
        console.log(chalk.gray('  Context: ') + chalk.green.bold(contextName) + chalk.gray(' (active)'));
        console.log('');
        console.log(chalk.gray(`Config lưu tại: ${cfg.getConfigPath()}`));
        console.log('');
        console.log(chalk.bold('Bắt đầu dùng:'));
        console.log(chalk.gray('  $ ') + 'jira issue search --project MYPROJ');
        console.log(chalk.gray('  $ ') + 'jira issue view MYPROJ-1');
        console.log(chalk.gray('  $ ') + 'jira project list');
        console.log('');
      } catch (err) {
        spinner.fail('Kết nối thất bại — đã rollback');
        try { cfg.removeContext(contextName); } catch {}
        try { cfg.removeCredential(credName); } catch {}
        try { cfg.removeServer(serverName); } catch {}
        handleError(err);
      }
    });

  return login;
}

module.exports = { buildLoginCommand };
