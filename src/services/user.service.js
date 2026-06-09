'use strict';

const { buildClient } = require('./jira.client');

/**
 * Search Jira users by display name, email, or username.
 * Works for both Cloud (v3) and Data Center (v2).
 */
async function searchUsers(query, { contextName, maxResults = 10 } = {}) {
  const client = buildClient(contextName);

  // Cloud uses userSearch.findUsers, DC/Server uses userSearch.findUsers too
  // but with different params. jira.js handles it.
  try {
    const users = await client.userSearch.findUsers({ query, maxResults });
    return users || [];
  } catch {
    // Fallback: some DC versions use different endpoint
    try {
      const users = await client.userSearch.findUsersWithBrowsePermission({
        username: query,
        maxResults,
      });
      return users || [];
    } catch {
      return [];
    }
  }
}

/**
 * Resolve assignee input to the correct Jira field.
 * - 'me' → skip lookup, will be handled by API
 * - email or accountId → use directly
 * - name or partial text → search and return best match
 *
 * Returns { accountId } for Cloud or { name } for DC/Server.
 */
async function resolveAssignee(input, { contextName } = {}) {
  if (!input) return undefined;
  if (input === 'me') {
    // Get current user
    const { testConnection } = require('./jira.client');
    const myself = await testConnection(contextName);
    return buildAssigneeField(myself, contextName);
  }

  // If looks like an email → search by it
  const users = await searchUsers(input, { contextName });
  if (users.length === 1) {
    return buildAssigneeField(users[0], contextName);
  }
  if (users.length > 1) {
    // Return array for caller to pick
    return { multiple: users };
  }

  // No result → return as-is (email), let Jira API decide
  return { emailAddress: input };
}

function buildAssigneeField(user, contextName) {
  const config = require('../config');
  const { server } = config.resolveContext(contextName);

  if (server.deployType === 'cloud') {
    return { accountId: user.accountId };
  }
  // DC/Server uses name or key
  return { name: user.name || user.key };
}

function formatUserChoice(user) {
  const parts = [user.displayName];
  if (user.emailAddress) parts.push(`<${user.emailAddress}>`);
  if (user.name && user.name !== user.displayName) parts.push(`(${user.name})`);
  return parts.join(' ');
}

module.exports = { searchUsers, resolveAssignee, buildAssigneeField, formatUserChoice };
