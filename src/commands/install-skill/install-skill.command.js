'use strict';

const { Command } = require('commander');
const inquirer = require('inquirer');
const fs = require('fs');
const path = require('path');
const os = require('os');
const chalk = require('chalk');

const SKILL_SOURCE = path.resolve(__dirname, '..', '..', '..', 'SKILL.md');
const HOME = os.homedir();

// ─── Agent registry ──────────────────────────────────────
const AGENTS = {
  claude: {
    name: 'Claude Code',
    dir: path.join(HOME, '.claude', 'commands'),
    file: 'jira-cli.md',
    detect: () => fs.existsSync(path.join(HOME, '.claude')),
    transform: (content) => content,
  },
  cursor: {
    name: 'Cursor',
    dir: path.join(HOME, '.cursor', 'rules'),
    file: 'jira-cli.mdc',
    detect: () => fs.existsSync(path.join(HOME, '.cursor')),
    transform: (content) => {
      const body = stripFrontmatter(content);
      return [
        '---',
        'description: "Jira CLI skill — guide for AI agent to operate Jira from terminal"',
        'globs: ',
        'alwaysApply: true',
        '---',
        '',
        body,
      ].join('\n');
    },
  },
  windsurf: {
    name: 'Windsurf',
    dir: path.join(HOME, '.codeium', 'windsurf', 'memories'),
    file: 'jira-cli.md',
    detect: () => fs.existsSync(path.join(HOME, '.codeium', 'windsurf')),
    transform: (content) => content,
  },
  openclaw: {
    name: 'OpenClaw',
    // Skills sống trong một thư mục con riêng, mỗi skill có file SKILL.md
    dir: path.join(HOME, '.openclaw', 'workspace', 'skills', 'jira-cli'),
    file: 'SKILL.md',
    detect: () => fs.existsSync(path.join(HOME, '.openclaw')),
    // OpenClaw dùng đúng format SKILL.md gốc (YAML frontmatter + MD body)
    transform: (content) => content,
  },
  roo: {
    name: 'Roo Code',
    dir: path.join(HOME, '.roo', 'rules'),
    file: 'jira-cli.md',
    detect: () => fs.existsSync(path.join(HOME, '.roo')),
    // Roo Code dùng MD thuần, strip frontmatter
    transform: (content) => stripFrontmatter(content),
  },
};

function stripFrontmatter(content) {
  const match = content.match(/^---\n[\s\S]*?\n---\n/);
  return match ? content.slice(match[0].length) : content;
}

function installToAgent(key, content, force) {
  const agent = AGENTS[key];
  const dest = path.join(agent.dir, agent.file);

  if (fs.existsSync(dest) && !force) {
    console.log(chalk.yellow(`  ⚠ ${agent.name}: đã tồn tại — bỏ qua`));
    console.log(chalk.gray(`    ${dest}`));
    console.log(chalk.gray('    Dùng --force để ghi đè.'));
    return false;
  }

  if (!fs.existsSync(agent.dir)) {
    fs.mkdirSync(agent.dir, { recursive: true });
  }

  const transformed = agent.transform(content);
  fs.writeFileSync(dest, transformed, 'utf-8');
  console.log(chalk.green(`  ✔ ${agent.name}: đã cài đặt`));
  console.log(chalk.gray(`    ${dest}`));
  return true;
}

// ─── Command ─────────────────────────────────────────────
function buildInstallSkillCommand() {
  const cmd = new Command('install-skill');
  cmd
    .description('Cài đặt Jira CLI skill vào AI agent trên máy cá nhân')
    .option('--force', 'Ghi đè nếu skill đã tồn tại')
    .option('--target <agents>', 'Agent đích, phân cách bằng dấu phẩy (claude,cursor,windsurf,openclaw,roo,all)')
    .action(async (opts) => {
      if (!fs.existsSync(SKILL_SOURCE)) {
        console.error(chalk.red('✖ Không tìm thấy SKILL.md trong project.'));
        process.exit(1);
      }

      const content = fs.readFileSync(SKILL_SOURCE, 'utf-8');
      const allKeys = Object.keys(AGENTS);

      // Detect installed agents
      const detected = allKeys.filter(k => AGENTS[k].detect());

      console.log(chalk.cyan('\n🔌 Jira CLI — Cài đặt Skill\n'));

      // Show detection status
      for (const k of allKeys) {
        const agent = AGENTS[k];
        const found = detected.includes(k);
        const icon = found ? chalk.green('●') : chalk.gray('○');
        console.log(`  ${icon} ${agent.name}${found ? '' : chalk.gray(' — không phát hiện')}`);
      }
      console.log('');

      if (detected.length === 0) {
        console.log(chalk.yellow('Không phát hiện AI agent nào trên máy.'));
        console.log(chalk.gray('Bạn có thể dùng --target để chỉ định thủ công, ví dụ:'));
        console.log(chalk.gray('  jira install-skill --target claude'));
        return;
      }

      let targets;

      if (opts.target) {
        // Non-interactive: parse --target
        const raw = opts.target.toLowerCase().split(',').map(s => s.trim());
        if (raw.includes('all')) {
          targets = allKeys;
        } else {
          const invalid = raw.filter(k => !AGENTS[k]);
          if (invalid.length) {
            console.error(chalk.red(`✖ Agent không hợp lệ: ${invalid.join(', ')}`));
            console.log(chalk.gray(`  Hợp lệ: ${allKeys.join(', ')}, all`));
            process.exit(1);
          }
          targets = raw;
        }
      } else {
        // Interactive: let user choose
        const choices = allKeys.map(k => ({
          name: `${AGENTS[k].name}${detected.includes(k) ? '' : chalk.gray(' (chưa cài)')}`,
          value: k,
          checked: detected.includes(k),
        }));

        const { selected } = await inquirer.prompt([{
          type: 'checkbox',
          name: 'selected',
          message: 'Chọn AI agent để cài skill:',
          choices,
          validate: v => v.length > 0 ? true : 'Chọn ít nhất một agent',
        }]);
        targets = selected;
      }

      console.log('');
      let installed = 0;
      for (const k of targets) {
        if (installToAgent(k, content, opts.force)) installed++;
      }

      console.log('');
      if (installed > 0) {
        console.log(chalk.green.bold(`Đã cài ${installed} agent.`) + chalk.gray(' AI sẽ tự nhận diện khi bạn nhắc đến Jira.'));
      } else {
        console.log(chalk.yellow('Không có agent nào được cài mới.') + chalk.gray(' Dùng --force để ghi đè.'));
      }
      console.log('');
    });

  return cmd;
}

module.exports = { buildInstallSkillCommand };
