'use strict';

/**
 * Build a JQL string from search options.
 * Returns raw jql if provided (highest priority).
 */
function buildJql({ jql, project, type, status, assignee, query } = {}) {
  if (jql) return jql;

  const parts = [];

  if (project)  parts.push(`project = "${project}"`);
  if (type)     parts.push(`issuetype = "${type}"`);
  if (status)   parts.push(`status = "${status}"`);
  if (assignee) {
    const val = assignee === 'me' ? 'currentUser()' : `"${assignee}"`;
    parts.push(`assignee = ${val}`);
  }
  if (query)    parts.push(`text ~ "${query}"`);

  const where = parts.join(' AND ');
  return where ? `${where} ORDER BY updated DESC` : 'ORDER BY updated DESC';
}

module.exports = { buildJql };
