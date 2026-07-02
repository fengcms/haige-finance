const { contextBridge, ipcRenderer } = require('electron');

const preloadVersion = '0.19.0';
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
  auth: {
    status: () => invoke('auth:status'),
    setupPassword: (input) => invoke('auth:setup-password', input),
    login: (input) => invoke('auth:login', input),
    changePassword: (input) => invoke('auth:change-password', input),
  },
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
  dictionaries: {
    list: (query) => invoke('dictionaries:list', query),
    update: (id, input) => invoke('dictionaries:update', { id, input }),
  },
  employees: crudApi('employees'),
  suppliers: crudApi('suppliers'),
  accounts: crudApi('accounts'),
  categories: crudApi('categories'),
  transactions: {
    ...crudApi('transactions'),
    void: (id, reason) => invoke('transactions:void', { id, reason }),
    accountBalances: () => invoke('transactions:account-balances'),
  },
  payroll: {
    listBatches: (query) => invoke('payroll:list-batches', query),
    createBatch: (input) => invoke('payroll:create-batch', input),
    updateBatch: (id, input) => invoke('payroll:update-batch', { id, input }),
    removeBatch: (id) => invoke('payroll:delete-batch', { id }),
    getDetail: (id) => invoke('payroll:get-detail', { id }),
    createItem: (input) => invoke('payroll:create-item', input),
    createItemsBatch: (input) => invoke('payroll:create-items-batch', input),
    updateItem: (id, input) => invoke('payroll:update-item', { id, input }),
    removeItem: (id) => invoke('payroll:delete-item', { id }),
    confirmBatch: (id) => invoke('payroll:confirm-batch', { id }),
    cancelConfirmBatch: (id) => invoke('payroll:cancel-confirm-batch', { id }),
    payBatch: (input) => invoke('payroll:pay-batch', input),
    voidBatch: (id, reason) => invoke('payroll:void-batch', { id, reason }),
  },
  projectExpenses: {
    listOrders: (query) => invoke('project-expenses:list-orders', query),
    createOrder: (input) => invoke('project-expenses:create-order', input),
    updateOrder: (id, input) => invoke('project-expenses:update-order', { id, input }),
    removeOrder: (id) => invoke('project-expenses:delete-order', { id }),
    getDetail: (id) => invoke('project-expenses:get-detail', { id }),
    createItem: (input) => invoke('project-expenses:create-item', input),
    createItemsBatch: (input) => invoke('project-expenses:create-items-batch', input),
    updateItem: (id, input) => invoke('project-expenses:update-item', { id, input }),
    removeItem: (id) => invoke('project-expenses:delete-item', { id }),
    confirmOrder: (id, accountId) => invoke('project-expenses:confirm-order', { id, accountId }),
    voidOrder: (id, reason) => invoke('project-expenses:void-order', { id, reason }),
  },
  projectStats: {
    list: () => invoke('project-stats:list'),
    detail: (projectId) => invoke('project-stats:detail', { projectId }),
  },
  reports: {
    get: (query) => invoke('reports:get', query),
  },
  settings: {
    get: () => invoke('settings:get'),
    update: (input) => invoke('settings:update', input),
  },
  maintenance: {
    info: () => invoke('maintenance:info'),
    backupDatabase: () => invoke('maintenance:backup-database'),
    restoreDatabase: () => invoke('maintenance:restore-database'),
    undoLastRestore: () => invoke('maintenance:undo-last-restore'),
    exportExcel: () => invoke('maintenance:export-excel'),
  },
});
