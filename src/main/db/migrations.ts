export const createAppMetaTableSql = `
  CREATE TABLE IF NOT EXISTS app_meta (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  );
`;

export const createCoreTablesSql = `
  CREATE TABLE IF NOT EXISTS dictionary_items (
    id TEXT PRIMARY KEY,
    dict_type TEXT NOT NULL,
    code TEXT NOT NULL,
    name TEXT NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'active',
    is_system INTEGER NOT NULL DEFAULT 1,
    remark TEXT,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    deleted_at INTEGER,
    CHECK (dict_type IN (
      'customer_status',
      'project_status',
      'project_type',
      'contract_status',
      'employee_status',
      'account_type',
      'account_status'
    )),
    CHECK (status IN ('active', 'inactive')),
    CHECK (is_system IN (0, 1)),
    CHECK (sort_order >= 0)
  );

  CREATE UNIQUE INDEX IF NOT EXISTS idx_dictionary_items_type_code ON dictionary_items(dict_type, code);
  CREATE INDEX IF NOT EXISTS idx_dictionary_items_dict_type ON dictionary_items(dict_type);
  CREATE INDEX IF NOT EXISTS idx_dictionary_items_status ON dictionary_items(status);

  CREATE TABLE IF NOT EXISTS customers (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    phone TEXT,
    address TEXT,
    community TEXT,
    house_number TEXT,
    status TEXT NOT NULL DEFAULT 'potential',
    remark TEXT,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    deleted_at INTEGER,
    CHECK (status IN ('potential', 'signed', 'in_progress', 'completed', 'invalid'))
  );

  CREATE INDEX IF NOT EXISTS idx_customers_name ON customers(name);
  CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);
  CREATE INDEX IF NOT EXISTS idx_customers_community ON customers(community);
  CREATE INDEX IF NOT EXISTS idx_customers_status ON customers(status);

  CREATE TABLE IF NOT EXISTS projects (
    id TEXT PRIMARY KEY,
    customer_id TEXT NOT NULL,
    name TEXT NOT NULL,
    community TEXT,
    address TEXT,
    project_type TEXT,
    status TEXT NOT NULL DEFAULT 'pending',
    remark TEXT,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    deleted_at INTEGER,
    FOREIGN KEY (customer_id) REFERENCES customers(id),
    CHECK (project_type IS NULL OR project_type IN ('renovation', 'cabinet', 'repair', 'other')),
    CHECK (status IN ('pending', 'signed', 'in_progress', 'completed', 'settled', 'voided'))
  );

  CREATE INDEX IF NOT EXISTS idx_projects_customer_id ON projects(customer_id);
  CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
  CREATE INDEX IF NOT EXISTS idx_projects_community ON projects(community);

  CREATE TABLE IF NOT EXISTS contracts (
    id TEXT PRIMARY KEY,
    customer_id TEXT NOT NULL,
    project_id TEXT NOT NULL,
    contract_no TEXT,
    name TEXT NOT NULL,
    amount_cents INTEGER NOT NULL,
    signed_date TEXT,
    status TEXT NOT NULL DEFAULT 'draft',
    remark TEXT,
    attachment_path TEXT,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    deleted_at INTEGER,
    FOREIGN KEY (customer_id) REFERENCES customers(id),
    FOREIGN KEY (project_id) REFERENCES projects(id),
    CHECK (amount_cents >= 0),
    CHECK (signed_date IS NULL OR signed_date GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'),
    CHECK (status IN ('draft', 'signed', 'in_progress', 'completed', 'settled', 'voided'))
  );

  CREATE UNIQUE INDEX IF NOT EXISTS idx_contracts_contract_no ON contracts(contract_no);
  CREATE INDEX IF NOT EXISTS idx_contracts_customer_id ON contracts(customer_id);
  CREATE INDEX IF NOT EXISTS idx_contracts_project_id ON contracts(project_id);
  CREATE INDEX IF NOT EXISTS idx_contracts_status ON contracts(status);

  CREATE TABLE IF NOT EXISTS contract_attachments (
    id TEXT PRIMARY KEY,
    contract_id TEXT NOT NULL,
    file_type TEXT NOT NULL,
    source_type TEXT NOT NULL,
    original_name TEXT NOT NULL,
    stored_name TEXT NOT NULL,
    stored_path TEXT NOT NULL,
    mime_type TEXT,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    deleted_at INTEGER,
    FOREIGN KEY (contract_id) REFERENCES contracts(id),
    CHECK (file_type IN ('image', 'pdf')),
    CHECK (source_type IN ('uploaded', 'generated')),
    CHECK (sort_order >= 0)
  );

  CREATE INDEX IF NOT EXISTS idx_contract_attachments_contract_id ON contract_attachments(contract_id);
  CREATE INDEX IF NOT EXISTS idx_contract_attachments_file_type ON contract_attachments(file_type);
  CREATE INDEX IF NOT EXISTS idx_contract_attachments_sort_order ON contract_attachments(sort_order);

  CREATE TABLE IF NOT EXISTS employees (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    phone TEXT,
    position TEXT,
    entry_date TEXT,
    status TEXT NOT NULL DEFAULT 'active',
    remark TEXT,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    deleted_at INTEGER,
    CHECK (entry_date IS NULL OR entry_date GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'),
    CHECK (status IN ('active', 'inactive', 'left'))
  );

  CREATE INDEX IF NOT EXISTS idx_employees_name ON employees(name);
  CREATE INDEX IF NOT EXISTS idx_employees_phone ON employees(phone);
  CREATE INDEX IF NOT EXISTS idx_employees_status ON employees(status);

  CREATE TABLE IF NOT EXISTS accounts (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active',
    opening_balance_cents INTEGER NOT NULL DEFAULT 0,
    remark TEXT,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    deleted_at INTEGER,
    CHECK (opening_balance_cents >= 0),
    CHECK (type IN ('cash', 'bank', 'wechat', 'alipay', 'shareholder', 'other')),
    CHECK (status IN ('active', 'inactive'))
  );

  CREATE UNIQUE INDEX IF NOT EXISTS idx_accounts_name ON accounts(name);
  CREATE INDEX IF NOT EXISTS idx_accounts_type ON accounts(type);
  CREATE INDEX IF NOT EXISTS idx_accounts_status ON accounts(status);

  CREATE TABLE IF NOT EXISTS categories (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    fund_type TEXT,
    affects_receivable INTEGER NOT NULL DEFAULT 0,
    affects_project_profit INTEGER NOT NULL DEFAULT 0,
    sort_order INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'active',
    remark TEXT,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    deleted_at INTEGER,
    CHECK (type IN ('income', 'expense')),
    CHECK (fund_type IS NULL OR fund_type IN (
      'customer_payment',
      'project_expense',
      'salary',
      'company_expense',
      'shareholder_investment',
      'shareholder_collection',
      'shareholder_payment',
      'loan_in',
      'loan_out',
      'transfer',
      'other_income',
      'other_expense'
    )),
    CHECK (affects_receivable IN (0, 1)),
    CHECK (affects_project_profit IN (0, 1)),
    CHECK (sort_order >= 0),
    CHECK (status IN ('active', 'inactive'))
  );

  CREATE UNIQUE INDEX IF NOT EXISTS idx_categories_name_type ON categories(name, type);
  CREATE INDEX IF NOT EXISTS idx_categories_type ON categories(type);
  CREATE INDEX IF NOT EXISTS idx_categories_fund_type ON categories(fund_type);
  CREATE INDEX IF NOT EXISTS idx_categories_status ON categories(status);

  CREATE TABLE IF NOT EXISTS transactions (
    id TEXT PRIMARY KEY,
    transaction_no TEXT,
    direction TEXT NOT NULL,
    amount_cents INTEGER NOT NULL,
    occurred_date TEXT NOT NULL,
    account_id TEXT NOT NULL,
    category_id TEXT NOT NULL,
    fund_type TEXT NOT NULL,
    is_company_fund INTEGER NOT NULL DEFAULT 1,
    affects_receivable INTEGER NOT NULL DEFAULT 0,
    affects_project_profit INTEGER NOT NULL DEFAULT 0,
    customer_id TEXT,
    project_id TEXT,
    employee_id TEXT,
    status TEXT NOT NULL DEFAULT 'normal',
    voided_at INTEGER,
    void_reason TEXT,
    remark TEXT,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    deleted_at INTEGER,
    FOREIGN KEY (account_id) REFERENCES accounts(id),
    FOREIGN KEY (category_id) REFERENCES categories(id),
    FOREIGN KEY (customer_id) REFERENCES customers(id),
    FOREIGN KEY (project_id) REFERENCES projects(id),
    FOREIGN KEY (employee_id) REFERENCES employees(id),
    CHECK (direction IN ('income', 'expense')),
    CHECK (amount_cents >= 0),
    CHECK (occurred_date GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'),
    CHECK (fund_type IN (
      'customer_payment',
      'project_expense',
      'salary',
      'company_expense',
      'shareholder_investment',
      'shareholder_collection',
      'shareholder_payment',
      'loan_in',
      'loan_out',
      'transfer',
      'other_income',
      'other_expense'
    )),
    CHECK (is_company_fund IN (0, 1)),
    CHECK (affects_receivable IN (0, 1)),
    CHECK (affects_project_profit IN (0, 1)),
    CHECK (status IN ('normal', 'voided', 'deleted')),
    CHECK (
      (status = 'voided' AND voided_at IS NOT NULL)
      OR (status <> 'voided')
    )
  );

  CREATE UNIQUE INDEX IF NOT EXISTS idx_transactions_transaction_no ON transactions(transaction_no);
  CREATE INDEX IF NOT EXISTS idx_transactions_occurred_date ON transactions(occurred_date);
  CREATE INDEX IF NOT EXISTS idx_transactions_account_id ON transactions(account_id);
  CREATE INDEX IF NOT EXISTS idx_transactions_category_id ON transactions(category_id);
  CREATE INDEX IF NOT EXISTS idx_transactions_customer_id ON transactions(customer_id);
  CREATE INDEX IF NOT EXISTS idx_transactions_project_id ON transactions(project_id);
  CREATE INDEX IF NOT EXISTS idx_transactions_employee_id ON transactions(employee_id);
  CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status);
  CREATE INDEX IF NOT EXISTS idx_transactions_fund_type ON transactions(fund_type);

  CREATE TABLE IF NOT EXISTS payroll_batches (
    id TEXT PRIMARY KEY,
    month TEXT NOT NULL,
    name TEXT NOT NULL,
    pay_date TEXT,
    account_id TEXT,
    status TEXT NOT NULL DEFAULT 'draft',
    total_gross_cents INTEGER NOT NULL DEFAULT 0,
    total_deduction_cents INTEGER NOT NULL DEFAULT 0,
    total_net_cents INTEGER NOT NULL DEFAULT 0,
    paid_transaction_id TEXT,
    voided_at INTEGER,
    void_reason TEXT,
    remark TEXT,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    deleted_at INTEGER,
    FOREIGN KEY (account_id) REFERENCES accounts(id),
    FOREIGN KEY (paid_transaction_id) REFERENCES transactions(id),
    CHECK (month GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]'),
    CHECK (pay_date IS NULL OR pay_date GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'),
    CHECK (status IN ('draft', 'confirmed', 'paid', 'voided')),
    CHECK (total_gross_cents >= 0),
    CHECK (total_deduction_cents >= 0),
    CHECK (total_net_cents >= 0)
  );

  CREATE INDEX IF NOT EXISTS idx_payroll_batches_month ON payroll_batches(month);
  CREATE INDEX IF NOT EXISTS idx_payroll_batches_status ON payroll_batches(status);
  CREATE INDEX IF NOT EXISTS idx_payroll_batches_account_id ON payroll_batches(account_id);

  CREATE TABLE IF NOT EXISTS payroll_items (
    id TEXT PRIMARY KEY,
    batch_id TEXT NOT NULL,
    employee_id TEXT NOT NULL,
    base_salary_cents INTEGER NOT NULL DEFAULT 0,
    attendance_bonus_cents INTEGER NOT NULL DEFAULT 0,
    phone_allowance_cents INTEGER NOT NULL DEFAULT 0,
    bonus_cents INTEGER NOT NULL DEFAULT 0,
    commission_cents INTEGER NOT NULL DEFAULT 0,
    deduction_cents INTEGER NOT NULL DEFAULT 0,
    social_insurance_cents INTEGER NOT NULL DEFAULT 0,
    housing_fund_cents INTEGER NOT NULL DEFAULT 0,
    tax_cents INTEGER NOT NULL DEFAULT 0,
    gross_salary_cents INTEGER NOT NULL DEFAULT 0,
    net_salary_cents INTEGER NOT NULL DEFAULT 0,
    remark TEXT,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    deleted_at INTEGER,
    FOREIGN KEY (batch_id) REFERENCES payroll_batches(id),
    FOREIGN KEY (employee_id) REFERENCES employees(id),
    CHECK (base_salary_cents >= 0),
    CHECK (attendance_bonus_cents >= 0),
    CHECK (phone_allowance_cents >= 0),
    CHECK (bonus_cents >= 0),
    CHECK (commission_cents >= 0),
    CHECK (deduction_cents >= 0),
    CHECK (social_insurance_cents >= 0),
    CHECK (housing_fund_cents >= 0),
    CHECK (tax_cents >= 0),
    CHECK (gross_salary_cents >= 0),
    CHECK (net_salary_cents >= 0)
  );

  CREATE INDEX IF NOT EXISTS idx_payroll_items_batch_id ON payroll_items(batch_id);
  CREATE INDEX IF NOT EXISTS idx_payroll_items_employee_id ON payroll_items(employee_id);

  CREATE TABLE IF NOT EXISTS payroll_operation_logs (
    id TEXT PRIMARY KEY,
    batch_id TEXT NOT NULL,
    item_id TEXT,
    action TEXT NOT NULL,
    detail TEXT,
    created_at INTEGER NOT NULL,
    FOREIGN KEY (batch_id) REFERENCES payroll_batches(id),
    FOREIGN KEY (item_id) REFERENCES payroll_items(id),
    CHECK (action IN ('create', 'update', 'delete', 'confirm', 'cancel_confirm', 'pay', 'void', 'adjust'))
  );

  CREATE INDEX IF NOT EXISTS idx_payroll_operation_logs_batch_id ON payroll_operation_logs(batch_id);
  CREATE INDEX IF NOT EXISTS idx_payroll_operation_logs_item_id ON payroll_operation_logs(item_id);
  CREATE INDEX IF NOT EXISTS idx_payroll_operation_logs_action ON payroll_operation_logs(action);

  CREATE TABLE IF NOT EXISTS operation_logs (
    id TEXT PRIMARY KEY,
    entity_type TEXT NOT NULL,
    entity_id TEXT,
    action TEXT NOT NULL,
    detail TEXT,
    created_at INTEGER NOT NULL,
    CHECK (action IN ('create', 'update', 'delete', 'void', 'restore', 'seed'))
  );

  CREATE INDEX IF NOT EXISTS idx_operation_logs_entity ON operation_logs(entity_type, entity_id);
  CREATE INDEX IF NOT EXISTS idx_operation_logs_action ON operation_logs(action);
  CREATE INDEX IF NOT EXISTS idx_operation_logs_created_at ON operation_logs(created_at);
`;

export const migrateSql = `${createAppMetaTableSql}\n${createCoreTablesSql}`;
