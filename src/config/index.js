'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');

const CONFIG_DIR = path.join(os.homedir(), '.atlassian-cli');
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json');

// ─── I/O ──────────────────────────────────────────────────
function readConfig() {
  if (!fs.existsSync(CONFIG_FILE)) return { servers: {}, credentials: {}, contexts: {}, activeContext: null };
  try {
    return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf-8'));
  } catch {
    return { servers: {}, credentials: {}, contexts: {}, activeContext: null };
  }
}

function writeConfig(data) {
  if (!fs.existsSync(CONFIG_DIR)) fs.mkdirSync(CONFIG_DIR, { recursive: true });
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(data, null, 2), { mode: 0o600 });
}

// ─── SERVER ───────────────────────────────────────────────
function addServer(name, { url, deployType }) {
  const cfg = readConfig();
  cfg.servers = cfg.servers || {};
  cfg.servers[name] = { url: url.replace(/\/$/, ''), deployType };
  writeConfig(cfg);
}

function listServers() {
  return readConfig().servers || {};
}

function getServer(name) {
  const servers = readConfig().servers || {};
  return servers[name] || null;
}

function removeServer(name) {
  const cfg = readConfig();
  delete (cfg.servers || {})[name];
  writeConfig(cfg);
}

// ─── CREDENTIAL ───────────────────────────────────────────
function addCredential(name, data) {
  const cfg = readConfig();
  cfg.credentials = cfg.credentials || {};
  cfg.credentials[name] = data;
  writeConfig(cfg);
}

function listCredentials() {
  return readConfig().credentials || {};
}

function getCredential(name) {
  const creds = readConfig().credentials || {};
  return creds[name] || null;
}

function removeCredential(name) {
  const cfg = readConfig();
  delete (cfg.credentials || {})[name];
  writeConfig(cfg);
}

function updateCredential(name, data) {
  const cfg = readConfig();
  cfg.credentials = cfg.credentials || {};
  if (!cfg.credentials[name]) throw new Error(`Credential "${name}" không tồn tại.`);
  cfg.credentials[name] = { ...cfg.credentials[name], ...data };
  writeConfig(cfg);
}

// ─── CONTEXT ──────────────────────────────────────────────
function addContext(name, { serverName, credentialName }) {
  const cfg = readConfig();
  cfg.contexts = cfg.contexts || {};
  cfg.contexts[name] = { server: serverName, credential: credentialName };
  if (!cfg.activeContext) cfg.activeContext = name;
  writeConfig(cfg);
}

function listContexts() {
  return readConfig().contexts || {};
}

function getContext(name) {
  const cfg = readConfig();
  const contexts = cfg.contexts || {};
  return contexts[name] || null;
}

function setActiveContext(name) {
  const cfg = readConfig();
  if (!(cfg.contexts || {})[name]) throw new Error(`Context "${name}" không tồn tại.`);
  cfg.activeContext = name;
  writeConfig(cfg);
}

function getActiveContextName() {
  return readConfig().activeContext || null;
}

function removeContext(name) {
  const cfg = readConfig();
  delete (cfg.contexts || {})[name];
  if (cfg.activeContext === name) cfg.activeContext = null;
  writeConfig(cfg);
}

// ─── RESOLVE ──────────────────────────────────────────────
/**
 * Resolve server + credential từ một context name (hoặc activeContext).
 * Dùng trước mỗi API call.
 */
function resolveContext(contextName) {
  const cfg = readConfig();
  const name = contextName || cfg.activeContext;

  if (!name) {
    throw new Error('Chưa có context active. Chạy: jira config context add');
  }

  const ctx = (cfg.contexts || {})[name];
  if (!ctx) throw new Error(`Context "${name}" không tồn tại.`);

  const server = (cfg.servers || {})[ctx.server];
  if (!server) throw new Error(`Server "${ctx.server}" không tồn tại.`);

  const credential = (cfg.credentials || {})[ctx.credential];
  if (!credential) throw new Error(`Credential "${ctx.credential}" không tồn tại.`);

  return { name, server, credential };
}

// ─── MISC ─────────────────────────────────────────────────
function getConfigPath() { return CONFIG_FILE; }

function viewAll() { return readConfig(); }

module.exports = {
  // server
  addServer, listServers, getServer, removeServer,
  // credential
  addCredential, listCredentials, getCredential, removeCredential, updateCredential,
  // context
  addContext, listContexts, getContext, setActiveContext, getActiveContextName, removeContext,
  // resolve
  resolveContext,
  // misc
  getConfigPath, viewAll,
};
