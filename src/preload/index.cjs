const { contextBridge, ipcRenderer } = require('electron');

const preloadVersion = '0.8.0';
const invoke = (channel, payload) => ipcRenderer.invoke(channel, payload);
const crudApi = (namespace) => ({
  list: (query) => invoke(`${namespace}:list`, query),
  create: (input) => invoke(`${namespace}:create`, input),
  update: (id, input) => invoke(`${namespace}:update`, { id, input }),
  remove: (id) => invoke(`${namespace}:delete`, { id }),
});

contextBridge.exposeInMainWorld('haige', {
  version: preloadVersion,
  appPing: () => ipcRenderer.invoke('app:ping'),
  invoke,
  customers: crudApi('customers'),
  projects: crudApi('projects'),
  contracts: crudApi('contracts'),
  employees: crudApi('employees'),
  accounts: crudApi('accounts'),
  categories: crudApi('categories'),
  transactions: {
    ...crudApi('transactions'),
    void: (id, reason) => invoke('transactions:void', { id, reason }),
    accountBalances: () => invoke('transactions:account-balances'),
  },
  projectStats: {
    list: () => invoke('project-stats:list'),
    detail: (projectId) => invoke('project-stats:detail', { projectId }),
  },
  reports: {
    get: (query) => invoke('reports:get', query),
  },
  maintenance: {
    info: () => invoke('maintenance:info'),
    backupDatabase: () => invoke('maintenance:backup-database'),
    exportExcel: () => invoke('maintenance:export-excel'),
  },
});
