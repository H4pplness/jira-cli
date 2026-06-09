'use strict';

const config = require('../config');

/**
 * Build the real Jira browse URL for an issue.
 * e.g. https://company.atlassian.net/browse/PROJ-123
 */
function getIssueUrl(issueKey, contextName) {
  try {
    const { server } = config.resolveContext(contextName);
    return `${server.url}/browse/${issueKey}`;
  } catch {
    return null;
  }
}

module.exports = { getIssueUrl };
