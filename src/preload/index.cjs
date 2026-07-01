const { contextBridge, ipcRenderer } = require('electron');

const preloadVersion = '0.11.0';
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
  contractAttachments: {
    list: (contractId) => invoke('contract-attachments:list', contractId),
    importFiles: (contractId) => invoke('contract-attachments:import-files', { contractId }),
    reorder: (contractId, orderedIds) => invoke('contract-attachments:reorder', { contractId, orderedIds }),
    rename: (id, originalName) => invoke('contract-attachments:rename', { id, originalName }),
    remove: (id) => invoke('contract-attachments:delete', { id }),
    openFile: (id) => invoke('contract-attachments:open-file', { id }),
    preview: (id) => invoke('contract-attachments:preview', { id }),
    generatePdf: (contractId) => invoke('contract-attachments:generate-pdf', { contractId }),
  },
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
