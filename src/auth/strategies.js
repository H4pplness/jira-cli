'use strict';

const inquirer = require('inquirer');
const chalk = require('chalk');

// ─── Basic (email + API token) ────────────────────────────
async function basicWizard(existingCred = {}) {
  console.log(chalk.gray(
    '\nTạo API Token tại:\n' +
    chalk.underline('https://id.atlassian.com/manage-profile/security/api-tokens') + '\n'
  ));

  const answers = await inquirer.prompt([
    {
      type: 'input',
      name: 'username',
      message: 'Email Atlassian:',
      default: existingCred.username || '',
      validate: v => v.includes('@') ? true : 'Email không hợp lệ',
      filter: v => v.trim(),
    },
    {
      type: 'password',
      name: 'secret',
      message: 'API Token:',
      mask: '*',
      validate: v => v.trim() ? true : 'Token không được để trống',
      filter: v => v.trim(),
    },
  ]);

  return { type: 'basic', username: answers.username, secret: answers.secret };
}

// ─── PAT (Personal Access Token) ─────────────────────────
async function patWizard(existingCred = {}) {
  console.log(chalk.gray(
    '\nDùng cho Jira Data Center / Server v7.9+.\n' +
    'Tạo PAT tại: Settings → Personal Access Tokens\n'
  ));

  const { token } = await inquirer.prompt([
    {
      type: 'password',
      name: 'token',
      message: 'Personal Access Token:',
      mask: '*',
      validate: v => v.trim() ? true : 'Token không được để trống',
      filter: v => v.trim(),
    },
  ]);

  return { type: 'pat', token };
}

// ─── OAuth2 (placeholder — yêu cầu app registration) ─────
async function oauth2Wizard() {
  console.log(chalk.yellow(
    '\n⚠  OAuth2 yêu cầu đăng ký Atlassian OAuth App trước.\n' +
    'Tham khảo: https://developer.atlassian.com/cloud/jira/platform/oauth-2-3lo-apps/\n'
  ));

  const answers = await inquirer.prompt([
    {
      type: 'input',
      name: 'clientId',
      message: 'Client ID:',
      validate: v => v.trim() ? true : 'Không được để trống',
      filter: v => v.trim(),
    },
    {
      type: 'password',
      name: 'clientSecret',
      message: 'Client Secret:',
      mask: '*',
      validate: v => v.trim() ? true : 'Không được để trống',
      filter: v => v.trim(),
    },
    {
      type: 'input',
      name: 'accessToken',
      message: 'Access Token (paste từ OAuth flow):',
      validate: v => v.trim() ? true : 'Không được để trống',
      filter: v => v.trim(),
    },
    {
      type: 'input',
      name: 'refreshToken',
      message: 'Refresh Token (để trống nếu không có):',
      filter: v => v.trim(),
    },
  ]);

  return {
    type: 'oauth2',
    clientId: answers.clientId,
    clientSecret: answers.clientSecret,
    accessToken: answers.accessToken,
    refreshToken: answers.refreshToken || undefined,
  };
}

// ─── Dispatch ─────────────────────────────────────────────
async function runCredentialWizard(type, existing) {
  switch (type) {
    case 'basic':  return basicWizard(existing);
    case 'pat':    return patWizard(existing);
    case 'oauth2': return oauth2Wizard();
    default: throw new Error(`Loại credential không hợp lệ: ${type}`);
  }
}

// ─── Mask sensitive fields for display ───────────────────
function maskCredential(cred) {
  if (!cred) return cred;
  const masked = { ...cred };
  ['secret', 'token', 'clientSecret', 'accessToken', 'refreshToken'].forEach(k => {
    if (masked[k]) {
      const v = masked[k];
      masked[k] = v.length > 8 ? v.slice(0, 4) + '****' + v.slice(-4) : '****';
    }
  });
  return masked;
}

module.exports = { runCredentialWizard, maskCredential };
