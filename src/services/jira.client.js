'use strict';

const { Version3Client, Version2Client } = require('jira.js');
const config = require('../config');

/**
 * Build a jira.js client from a resolved context.
 * @param {object} opts - { contextName } optional, defaults to activeContext
 */
function buildClient(contextName) {
  const { server, credential } = config.resolveContext(contextName);

  // Cloud → v3, Data Center/Server → v2
  const ClientClass = server.deployType === 'cloud' ? Version3Client : Version2Client;

  const authentication = buildAuth(credential);

  return new ClientClass({
    host: server.url,
    authentication,
    newErrorHandling: true,
  });
}

function buildAuth(credential) {
  switch (credential.type) {
    case 'basic':
      return { basic: { email: credential.username, apiToken: credential.secret } };
    case 'pat':
      return { personalAccessToken: credential.token };
    case 'oauth2':
      return { oauth2: { accessToken: credential.accessToken } };
    default:
      throw new Error(`Loại credential không được hỗ trợ: ${credential.type}`);
  }
}

/**
 * Test kết nối: trả về thông tin user hiện tại hoặc throw.
 */
async function testConnection(contextName) {
  const client = buildClient(contextName);
  const myself = await client.myself.getCurrentUser();
  return myself;
}

module.exports = { buildClient, testConnection };
