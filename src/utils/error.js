'use strict';

const chalk = require('chalk');

function handleError(err) {
  const msg = err.message || String(err);

  if (msg.includes('Chưa có context') || msg.includes('không tồn tại')) {
    console.error(chalk.red('✖ ') + msg);
    process.exit(1);
  }
  if (err.status === 401) { console.error(chalk.red('✖ Xác thực thất bại. Chạy: jira config credential renew <name>')); process.exit(1); }
  if (err.status === 403) { console.error(chalk.red('✖ Không có quyền.')); process.exit(1); }
  if (err.status === 404) { console.error(chalk.red('✖ Không tìm thấy resource.')); process.exit(1); }
  if (err.code === 'ENOTFOUND' || err.code === 'ECONNREFUSED') {
    console.error(chalk.red('✖ Không thể kết nối server. Kiểm tra lại URL.'));
    process.exit(1);
  }
  console.error(chalk.red('✖ ') + msg);
  if (process.env.DEBUG) console.error(err);
  process.exit(1);
}

module.exports = { handleError };
