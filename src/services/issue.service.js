'use strict';

const { buildClient } = require('./jira.client');

const DEFAULT_FIELDS = [
  'summary', 'status', 'assignee', 'reporter', 'priority',
  'issuetype', 'project', 'created', 'updated', 'duedate',
  'description', 'labels', 'subtasks', 'parent', 'comment',
];

async function searchIssues({ jql, limit = 20, contextName } = {}) {
  const client = buildClient(contextName);
  return client.issueSearch.searchForIssuesUsingJql({
    jql,
    maxResults: limit,
    fields: DEFAULT_FIELDS,
  });
}

async function getIssue(issueKey, { contextName } = {}) {
  const client = buildClient(contextName);
  return client.issues.getIssue({
    issueIdOrKey: issueKey,
    fields: [...DEFAULT_FIELDS, 'attachment'],
  });
}

async function createIssue({ projectKey, summary, description, issueType, assignee, priority, dueDate, labels, parentKey, contextName } = {}) {
  const client = buildClient(contextName);

  const fields = {
    project: { key: projectKey },
    summary,
    issuetype: { name: issueType },
  };

  if (description) fields.description = toADF(description);
  if (assignee)    fields.assignee    = { emailAddress: assignee };
  if (priority)    fields.priority    = { name: priority };
  if (dueDate)     fields.duedate     = dueDate;
  if (labels?.length) fields.labels   = labels;
  if (parentKey)   fields.parent      = { key: parentKey };

  return client.issues.createIssue({ fields });
}

async function updateIssue(issueKey, updates = {}, { contextName } = {}) {
  const client = buildClient(contextName);
  const fields = {};

  if (updates.summary)     fields.summary     = updates.summary;
  if (updates.priority)    fields.priority    = { name: updates.priority };
  if (updates.dueDate)     fields.duedate     = updates.dueDate;
  if (updates.assignee)    fields.assignee    = { emailAddress: updates.assignee };
  if (updates.labels)      fields.labels      = updates.labels;
  if (updates.description) fields.description = toADF(updates.description);

  await client.issues.editIssue({ issueIdOrKey: issueKey, fields });
}

async function addComment(issueKey, text, { contextName } = {}) {
  const client = buildClient(contextName);
  return client.issueComments.addComment({
    issueIdOrKey: issueKey,
    body: toADF(text),
  });
}

async function getTransitions(issueKey, { contextName } = {}) {
  const client = buildClient(contextName);
  const res = await client.issues.getTransitions({ issueIdOrKey: issueKey });
  return res.transitions || [];
}

async function doTransition(issueKey, transitionId, { contextName } = {}) {
  const client = buildClient(contextName);
  await client.issues.doTransition({
    issueIdOrKey: issueKey,
    transition: { id: transitionId },
  });
}

// ADF helper
function toADF(text) {
  return {
    type: 'doc', version: 1,
    content: [{ type: 'paragraph', content: [{ type: 'text', text }] }],
  };
}

module.exports = { searchIssues, getIssue, createIssue, updateIssue, addComment, getTransitions, doTransition };
