'use strict';

const { buildClient } = require('./jira.client');

async function listProjects({ contextName } = {}) {
  const client = buildClient(contextName);
  return client.projects.getAllProjects({ expand: 'description,lead' });
}

async function getProject(key, { contextName } = {}) {
  const client = buildClient(contextName);
  return client.projects.getProject({ projectIdOrKey: key, expand: 'description,lead,issueTypes' });
}

module.exports = { listProjects, getProject };
