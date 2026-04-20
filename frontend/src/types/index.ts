export type User = { id: number; email: string; name: string };

export type Category = {
  id: number;
  budget_id: number;
  name: string;
  limit_amount: string;
  color: string;
  icon: string;
  sort_order: number;
};

export type Budget = {
  id: number;
  user_id: number;
  year: number;
  month: number;
  name: string;
  projected_income: string;
  categories: Category[];
  created_at: string;
};

export type TxnType = "income" | "expense";

export type Transaction = {
  id: number;
  date: string;
  amount: string;
  description: string;
  type: TxnType;
  source: string;
  category_id: number | null;
  import_id: number | null;
  created_at: string;
};

export type CategorySummary = {
  category_id: number | null;
  name: string;
  color: string;
  limit_amount: string;
  spent: string;
  remaining: string;
  percent_used: number;
};

export type DashboardSummary = {
  year: number;
  month: number;
  total_income: string;
  total_expense: string;
  balance: string;
  projected_income: string;
  projected_vs_actual: string;
  budget_total: string;
  budget_used: string;
  categories: CategorySummary[];
  health_score: number;
  ready_to_invest: boolean;
};

export type ImportRow = {
  id: number;
  filename: string;
  rows_total: number;
  rows_imported: number;
  rows_skipped: number;
  status: string;
  error: string;
  created_at: string;
};

export type ImportRowError = {
  row: number;
  field: string;
  message: string;
};

export type ImportTemplatePreviewRow = {
  date: string;
  amount: string;
  description: string;
  type: TxnType;
  category_id: number | null;
  category_name: string | null;
};

export type ImportTemplateValidateResponse = {
  filename: string;
  total_rows: number;
  valid_rows: number;
  errors: ImportRowError[];
  sample: ImportTemplatePreviewRow[];
};

export type Recurring = {
  id: number;
  day_of_month: number;
  amount: string;
  description: string;
  type: TxnType;
  category_id: number | null;
  active: boolean;
  note: string;
  created_at: string;
};
