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
