'use strict';

const { buildClient } = require('./jira.client');

/**
 * Add a worklog entry to an issue.
 * @param {string} issueKey
 * @param {object} opts
 * @param {string} opts.timeSpent - e.g. '2h', '30m', '1d', '3h 30m'
 * @param {string} [opts.comment] - worklog comment
 * @param {string} [opts.started] - ISO date string, defaults to now
 * @param {string} [opts.contextName]
 */
async function addWorklog(issueKey, { timeSpent, comment, started, contextName } = {}) {
  const client = buildClient(contextName);

  const body = {
    issueIdOrKey: issueKey,
    timeSpent,
  };

  if (started) {
    body.started = formatJiraDate(started);
  }

  if (comment) {
    body.comment = {
      type: 'doc', version: 1,
      content: [{ type: 'paragraph', content: [{ type: 'text', text: comment }] }],
    };
  }

  return client.issueWorklogs.addWorklog(body);
}

/**
 * Get worklogs for an issue.
 */
async function getWorklogs(issueKey, { contextName } = {}) {
  const client = buildClient(contextName);
  const result = await client.issueWorklogs.getIssueWorklog({ issueIdOrKey: issueKey });
  return result.worklogs || [];
}

/**
 * Format a date string or Date to Jira REST format.
 * Jira expects: "2024-01-15T09:00:00.000+0000"
 */
function formatJiraDate(dateStr) {
  if (!dateStr) return undefined;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return undefined;
  return d.toISOString().replace('Z', '+0000');
}

/**
 * Parse human time string "2h 30m" → "2h 30m" (pass through).
 * Validate format.
 */
function validateTimeSpent(input) {
  if (!input || !input.trim()) return false;
  // Accept Jira time notation: Xw Xd Xh Xm (weeks, days, hours, minutes)
  const normalized = input.trim().toLowerCase();
  const pattern = /^(\d+w\s*)?(\d+d\s*)?(\d+h\s*)?(\d+m\s*)?$/;
  return pattern.test(normalized) && normalized.length > 0 && /\d/.test(normalized);
}

module.exports = { addWorklog, getWorklogs, validateTimeSpent };
