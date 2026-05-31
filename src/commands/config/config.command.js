'use strict';

const { Command } = require('commander');
const inquirer = require('inquirer');
const ora = require('ora');
const chalk = require('chalk');
const Table = require('cli-table3');
const cfg = require('../../config');
const { runCredentialWizard, maskCredential } = require('../../auth/strategies');
const { testConnection } = require('../../services/jira.client');
const { handleError } = require('../../utils/error');

function buildConfigCommand() {
  const config = new Command('config');
  config.description('Quản lý cấu hình: server, credential, context');

  // ── config view ────────────────────────────────────────
  config
    .command('view')
    .description('Xem toàn bộ config hiện tại')
    .action(() => {
      const all = cfg.viewAll();
      const active = all.activeContext;

      console.log(chalk.bold.cyan('\n── Servers ──────────────────────────────'));
      const servers = all.servers || {};
      if (!Object.keys(servers).length) console.log(chalk.gray('  (trống)'));
      else Object.entries(servers).forEach(([n, s]) =>
        console.log(`  ${chalk.bold(n)}  ${chalk.gray(s.deployType)}  ${s.url}`)
      );

      console.log(chalk.bold.cyan('\n── Credentials ──────────────────────────'));
      const creds = all.credentials || {};
      if (!Object.keys(creds).length) console.log(chalk.gray('  (trống)'));
      else Object.entries(creds).forEach(([n, c]) => {
        const m = maskCredential(c);
        const detail = c.type === 'basic' ? `${m.username} / ${m.secret}` :
                       c.type === 'pat'   ? `token: ${m.token}` : `oauth2`;
        console.log(`  ${chalk.bold(n)}  [${c.type}]  ${detail}`);
      });

      console.log(chalk.bold.cyan('\n── Contexts ──────────────────────────────'));
      const contexts = all.contexts || {};
      if (!Object.keys(contexts).length) console.log(chalk.gray('  (trống)'));
      else Object.entries(contexts).forEach(([n, c]) => {
        const isActive = n === active ? chalk.green(' ✔ active') : '';
        console.log(`  ${chalk.bold(n)}  server:${c.server}  cred:${c.credential}${isActive}`);
      });
      console.log('');
    });

  // ── config current ─────────────────────────────────────
  config
    .command('current')
    .description('Xem context đang active')
    .action(() => {
      const name = cfg.getActiveContextName();
      if (!name) { console.log(chalk.yellow('Chưa có context active. Chạy: jira login')); return; }
      const ctx = cfg.getContext(name);
      console.log(chalk.green(`✔ Active context: ${chalk.bold(name)}`));
      console.log(chalk.gray(`  Server:     ${ctx.server}`));
      console.log(chalk.gray(`  Credential: ${ctx.credential}`));
    });

  // ═══════════════════════════════════════════════════════
  // SERVER
  // ═══════════════════════════════════════════════════════
  const server = new Command('server');
  server.description('Quản lý Jira server instances');

  server
    .command('add <name>')
    .description('Thêm server mới')
    .option('--url <url>', 'Jira host URL')
    .option('--type <type>', 'cloud | datacenter | server')
    .action(async (name, opts) => {
      try {
        const existing = cfg.getServer(name);
        const answers = await inquirer.prompt([
          {
            type: 'input', name: 'url', message: 'Jira host URL (vd: https://company.atlassian.net):',
            default: opts.url || existing?.url || '',
            validate: v => v.startsWith('http') ? true : 'URL phải bắt đầu bằng http(s)://',
            filter: v => v.trim().replace(/\/$/, ''),
            when: !opts.url,
          },
          {
            type: 'list', name: 'deployType', message: 'Loại deployment:',
            choices: ['cloud', 'datacenter', 'server'],
            default: opts.type || existing?.deployType || 'cloud',
            when: !opts.type,
          },
        ]);

        cfg.addServer(name, {
          url: opts.url || answers.url,
          deployType: opts.type || answers.deployType,
        });
        console.log(chalk.green(`✔ Server "${name}" đã được lưu.`));
      } catch (err) { handleError(err); }
    });

  server
    .command('list')
    .description('Liệt kê tất cả servers')
    .action(() => {
      const servers = cfg.listServers();
      const entries = Object.entries(servers);
      if (!entries.length) { console.log(chalk.yellow('Chưa có server nào.')); return; }
      const t = new Table({ head: ['Name','Type','URL'].map(h => chalk.cyan(h)), style: { border: ['gray'] } });
      entries.forEach(([n, s]) => t.push([chalk.bold(n), s.deployType, s.url]));
      console.log(t.toString());
    });

  server
    .command('remove <name>')
    .description('Xoá server')
    .action(async (name) => {
      const { ok } = await inquirer.prompt([{ type: 'confirm', name: 'ok', message: `Xoá server "${name}"?`, default: false }]);
      if (ok) { cfg.removeServer(name); console.log(chalk.green(`✔ Đã xoá server "${name}".`)); }
    });

  server
    .command('test <name>')
    .description('Kiểm tra kết nối server (cần context trỏ tới server này)')
    .action(async (name) => {
      // Find a context that uses this server
      const contexts = cfg.listContexts();
      const ctxEntry = Object.entries(contexts).find(([, c]) => c.server === name);
      if (!ctxEntry) {
        console.log(chalk.yellow(`Không tìm thấy context nào dùng server "${name}". Tạo context trước.`));
        return;
      }
      const spinner = ora('Đang kiểm tra kết nối...').start();
      try {
        const user = await testConnection(ctxEntry[0]);
        spinner.succeed(`Kết nối OK — ${user.displayName} (${user.emailAddress})`);
      } catch (err) { spinner.fail('Kết nối thất bại'); handleError(err); }
    });

  config.addCommand(server);

  // ═══════════════════════════════════════════════════════
  // CREDENTIAL
  // ═══════════════════════════════════════════════════════
  const credential = new Command('credential');
  credential.description('Quản lý thông tin xác thực');

  credential
    .command('add <name>')
    .description('Thêm credential mới')
    .option('--type <type>', 'basic | pat | oauth2')
    .action(async (name, opts) => {
      try {
        let type = opts.type;
        if (!type) {
          const ans = await inquirer.prompt([{
            type: 'list', name: 'type', message: 'Loại xác thực:',
            choices: [
              { name: 'basic  — Email + API Token (Jira Cloud)', value: 'basic' },
              { name: 'pat    — Personal Access Token (Data Center/Server)', value: 'pat' },
              { name: 'oauth2 — OAuth 2.0 (nâng cao)', value: 'oauth2' },
            ],
          }]);
          type = ans.type;
        }
        const data = await runCredentialWizard(type);
        cfg.addCredential(name, data);
        console.log(chalk.green(`✔ Credential "${name}" [${type}] đã được lưu.`));
      } catch (err) { handleError(err); }
    });

  credential
    .command('list')
    .description('Liệt kê credentials (token bị mask)')
    .action(() => {
      const creds = cfg.listCredentials();
      const entries = Object.entries(creds);
      if (!entries.length) { console.log(chalk.yellow('Chưa có credential nào.')); return; }
      const t = new Table({ head: ['Name','Type','Info'].map(h => chalk.cyan(h)), style: { border: ['gray'] } });
      entries.forEach(([n, c]) => {
        const m = maskCredential(c);
        const info = c.type === 'basic' ? `${m.username}` : c.type === 'pat' ? `token: ${m.token}` : 'oauth2';
        t.push([chalk.bold(n), c.type, info]);
      });
      console.log(t.toString());
    });

  credential
    .command('remove <name>')
    .description('Xoá credential')
    .action(async (name) => {
      const { ok } = await inquirer.prompt([{ type: 'confirm', name: 'ok', message: `Xoá credential "${name}"?`, default: false }]);
      if (ok) { cfg.removeCredential(name); console.log(chalk.green(`✔ Đã xoá credential "${name}".`)); }
    });

  credential
    .command('renew <name>')
    .description('Gia hạn / làm mới token')
    .action(async (name) => {
      const existing = cfg.getCredential(name);
      if (!existing) { console.error(chalk.red(`✖ Credential "${name}" không tồn tại.`)); process.exit(1); }
      try {
        const updated = await runCredentialWizard(existing.type, existing);
        cfg.updateCredential(name, updated);
        console.log(chalk.green(`✔ Credential "${name}" đã được cập nhật.`));
      } catch (err) { handleError(err); }
    });

  config.addCommand(credential);

  // ═══════════════════════════════════════════════════════
  // CONTEXT
  // ═══════════════════════════════════════════════════════
  const context = new Command('context');
  context.description('Ghép server + credential thành context');

  context
    .command('add <name>')
    .description('Tạo context mới')
    .option('--server <name>', 'Tên server')
    .option('--credential <name>', 'Tên credential')
    .action(async (name, opts) => {
      try {
        const serverNames = Object.keys(cfg.listServers());
        const credNames = Object.keys(cfg.listCredentials());

        if (!serverNames.length) { console.error(chalk.red('✖ Chưa có server. Chạy: jira config server add')); process.exit(1); }
        if (!credNames.length)   { console.error(chalk.red('✖ Chưa có credential. Chạy: jira config credential add')); process.exit(1); }

        const answers = await inquirer.prompt([
          { type: 'list', name: 'serverName', message: 'Chọn server:', choices: serverNames, when: !opts.server },
          { type: 'list', name: 'credentialName', message: 'Chọn credential:', choices: credNames, when: !opts.credential },
        ]);

        const serverName     = opts.server     || answers.serverName;
        const credentialName = opts.credential || answers.credentialName;

        const spinner = ora('Đang test kết nối...').start();
        cfg.addContext(name, { serverName, credentialName });
        try {
          const user = await testConnection(name);
          spinner.succeed(`Kết nối OK — ${user.displayName} (${user.emailAddress})`);
          console.log(chalk.green(`✔ Context "${name}" đã được tạo và set active.`));
        } catch {
          spinner.warn(`Context "${name}" đã được lưu nhưng test kết nối thất bại. Kiểm tra lại credentials.`);
        }
      } catch (err) { handleError(err); }
    });

  context
    .command('list')
    .description('Liệt kê tất cả contexts')
    .action(() => {
      const contexts = cfg.listContexts();
      const active = cfg.getActiveContextName();
      const entries = Object.entries(contexts);
      if (!entries.length) { console.log(chalk.yellow('Chưa có context nào.')); return; }
      const t = new Table({ head: ['','Name','Server','Credential'].map(h => chalk.cyan(h)), style: { border: ['gray'] } });
      entries.forEach(([n, c]) => t.push([n === active ? chalk.green('✔') : '', chalk.bold(n), c.server, c.credential]));
      console.log(t.toString());
    });

  context
    .command('use <name>')
    .description('Đổi context đang active')
    .action((name) => {
      try { cfg.setActiveContext(name); console.log(chalk.green(`✔ Active context → "${name}"`)); }
      catch (err) { handleError(err); }
    });

  context
    .command('remove <name>')
    .description('Xoá context')
    .action(async (name) => {
      const { ok } = await inquirer.prompt([{ type: 'confirm', name: 'ok', message: `Xoá context "${name}"?`, default: false }]);
      if (ok) { cfg.removeContext(name); console.log(chalk.green(`✔ Đã xoá context "${name}".`)); }
    });

  context
    .command('test [name]')
    .description('Test kết nối của context')
    .option('--all', 'Test tất cả contexts')
    .action(async (name, opts) => {
      const contexts = cfg.listContexts();
      const toTest = opts.all ? Object.keys(contexts) : [name || cfg.getActiveContextName()];

      for (const ctxName of toTest) {
        const spinner = ora(`Testing "${ctxName}"...`).start();
        try {
          const user = await testConnection(ctxName);
          spinner.succeed(`"${ctxName}" OK — ${user.displayName}`);
        } catch (err) {
          spinner.fail(`"${ctxName}" thất bại — ${err.message}`);
        }
      }
    });

  config.addCommand(context);

  return config;
}

module.exports = { buildConfigCommand };
