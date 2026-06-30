CREATE TABLE `accounts` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`type` text NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`opening_balance_cents` integer DEFAULT 0 NOT NULL,
	`remark` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_accounts_name` ON `accounts` (`name`);--> statement-breakpoint
CREATE INDEX `idx_accounts_type` ON `accounts` (`type`);--> statement-breakpoint
CREATE INDEX `idx_accounts_status` ON `accounts` (`status`);--> statement-breakpoint
CREATE TABLE `app_meta` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `categories` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`type` text NOT NULL,
	`fund_type` text,
	`affects_receivable` integer DEFAULT false NOT NULL,
	`affects_project_profit` integer DEFAULT false NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`remark` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_categories_name_type` ON `categories` (`name`,`type`);--> statement-breakpoint
CREATE INDEX `idx_categories_type` ON `categories` (`type`);--> statement-breakpoint
CREATE INDEX `idx_categories_fund_type` ON `categories` (`fund_type`);--> statement-breakpoint
CREATE INDEX `idx_categories_status` ON `categories` (`status`);--> statement-breakpoint
CREATE TABLE `contracts` (
	`id` text PRIMARY KEY NOT NULL,
	`customer_id` text NOT NULL,
	`project_id` text NOT NULL,
	`contract_no` text,
	`name` text NOT NULL,
	`amount_cents` integer NOT NULL,
	`signed_date` text,
	`status` text DEFAULT 'draft' NOT NULL,
	`remark` text,
	`attachment_path` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer,
	FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_contracts_contract_no` ON `contracts` (`contract_no`);--> statement-breakpoint
CREATE INDEX `idx_contracts_customer_id` ON `contracts` (`customer_id`);--> statement-breakpoint
CREATE INDEX `idx_contracts_project_id` ON `contracts` (`project_id`);--> statement-breakpoint
CREATE INDEX `idx_contracts_status` ON `contracts` (`status`);--> statement-breakpoint
CREATE TABLE `customers` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`phone` text,
	`address` text,
	`community` text,
	`house_number` text,
	`status` text DEFAULT 'potential' NOT NULL,
	`remark` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer
);
--> statement-breakpoint
CREATE INDEX `idx_customers_name` ON `customers` (`name`);--> statement-breakpoint
CREATE INDEX `idx_customers_phone` ON `customers` (`phone`);--> statement-breakpoint
CREATE INDEX `idx_customers_community` ON `customers` (`community`);--> statement-breakpoint
CREATE INDEX `idx_customers_status` ON `customers` (`status`);--> statement-breakpoint
CREATE TABLE `employees` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`phone` text,
	`position` text,
	`entry_date` text,
	`status` text DEFAULT 'active' NOT NULL,
	`remark` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer
);
--> statement-breakpoint
CREATE INDEX `idx_employees_name` ON `employees` (`name`);--> statement-breakpoint
CREATE INDEX `idx_employees_phone` ON `employees` (`phone`);--> statement-breakpoint
CREATE INDEX `idx_employees_status` ON `employees` (`status`);--> statement-breakpoint
CREATE TABLE `operation_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`entity_type` text NOT NULL,
	`entity_id` text,
	`action` text NOT NULL,
	`detail` text,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_operation_logs_entity` ON `operation_logs` (`entity_type`,`entity_id`);--> statement-breakpoint
CREATE INDEX `idx_operation_logs_action` ON `operation_logs` (`action`);--> statement-breakpoint
CREATE INDEX `idx_operation_logs_created_at` ON `operation_logs` (`created_at`);--> statement-breakpoint
CREATE TABLE `projects` (
	`id` text PRIMARY KEY NOT NULL,
	`customer_id` text NOT NULL,
	`name` text NOT NULL,
	`community` text,
	`address` text,
	`project_type` text,
	`status` text DEFAULT 'pending' NOT NULL,
	`remark` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer,
	FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_projects_customer_id` ON `projects` (`customer_id`);--> statement-breakpoint
CREATE INDEX `idx_projects_status` ON `projects` (`status`);--> statement-breakpoint
CREATE INDEX `idx_projects_community` ON `projects` (`community`);--> statement-breakpoint
CREATE TABLE `transactions` (
	`id` text PRIMARY KEY NOT NULL,
	`transaction_no` text,
	`direction` text NOT NULL,
	`amount_cents` integer NOT NULL,
	`occurred_date` text NOT NULL,
	`account_id` text NOT NULL,
	`category_id` text NOT NULL,
	`fund_type` text NOT NULL,
	`is_company_fund` integer DEFAULT true NOT NULL,
	`affects_receivable` integer DEFAULT false NOT NULL,
	`affects_project_profit` integer DEFAULT false NOT NULL,
	`customer_id` text,
	`project_id` text,
	`employee_id` text,
	`status` text DEFAULT 'normal' NOT NULL,
	`voided_at` integer,
	`void_reason` text,
	`remark` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer,
	FOREIGN KEY (`account_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`employee_id`) REFERENCES `employees`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_transactions_transaction_no` ON `transactions` (`transaction_no`);--> statement-breakpoint
CREATE INDEX `idx_transactions_occurred_date` ON `transactions` (`occurred_date`);--> statement-breakpoint
CREATE INDEX `idx_transactions_account_id` ON `transactions` (`account_id`);--> statement-breakpoint
CREATE INDEX `idx_transactions_category_id` ON `transactions` (`category_id`);--> statement-breakpoint
CREATE INDEX `idx_transactions_customer_id` ON `transactions` (`customer_id`);--> statement-breakpoint
CREATE INDEX `idx_transactions_project_id` ON `transactions` (`project_id`);--> statement-breakpoint
CREATE INDEX `idx_transactions_employee_id` ON `transactions` (`employee_id`);--> statement-breakpoint
CREATE INDEX `idx_transactions_status` ON `transactions` (`status`);--> statement-breakpoint
CREATE INDEX `idx_transactions_fund_type` ON `transactions` (`fund_type`);