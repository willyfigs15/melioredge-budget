"use client";

import { useEffect, useState } from "react";
import { ArrowDownRight, ArrowUpRight, Plus, Trash2 } from "lucide-react";
import { api } from "@/lib/api";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { Card, CardBody } from "@/components/ui/Card";
import { TransactionForm } from "@/components/transactions/TransactionForm";
import type { Budget, Transaction } from "@/types";

export default function TransactionsPage() {
  const [items, setItems] = useState<Transaction[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const [txRes, bRes] = await Promise.all([
      api.get("/api/transactions", { params: { limit: 200 } }),
      api.get("/api/budgets"),
    ]);
    setItems(txRes.data.items);
    setBudgets(bRes.data);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const remove = async (id: number) => {
    if (!confirm("Delete this transaction?")) return;
    await api.delete(`/api/transactions/${id}`);
    setItems((prev) => prev.filter((t) => t.id !== id));
  };

  const categories = budgets.flatMap((b) => b.categories);
  const catMap = new Map(categories.map((c) => [c.id, c]));

  return (
    <div className="py-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Transactions</h1>
        <Button size="sm" onClick={() => setShowForm((v) => !v)}>
          <Plus className="h-4 w-4" /> Add
        </Button>
      </div>

      {showForm && (
        <TransactionForm
          categories={categories}
          onClose={() => setShowForm(false)}
          onSaved={(t) => { setItems((prev) => [t, ...prev]); setShowForm(false); }}
        />
      )}

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : items.length === 0 ? (
        <Card>
          <CardBody>
            <p className="text-sm text-muted-foreground">No transactions yet. Add one, or import a CSV.</p>
          </CardBody>
        </Card>
      ) : (
        <ul className="space-y-2">
          {items.map((t) => {
            const cat = t.category_id ? catMap.get(t.category_id) : null;
            const isIncome = t.type === "income";
            const sign = isIncome ? "+" : "-";
            const TypeIcon = isIncome ? ArrowUpRight : ArrowDownRight;
            return (
              <li key={t.id}>
                <Card>
                  <CardBody className="py-3 flex items-center gap-3">
                    <span
                      className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 ring-1 ${
                        isIncome
                          ? "bg-primary/15 text-primary ring-primary/30"
                          : "bg-destructive/15 text-destructive-foreground ring-destructive/40"
                      }`}
                      aria-label={isIncome ? "Income" : "Expense"}
                    >
                      <TypeIcon className="h-4 w-4" />
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {t.description || <span className="text-muted-foreground">Untitled</span>}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(t.date)} · {cat?.name ?? "Uncategorized"}
                        {t.source === "import" && " · CSV"}
                      </p>
                    </div>
                    <p className={`text-sm font-semibold tabular-nums ${t.type === "income" ? "text-primary" : "text-destructive-foreground"}`}>
                      {sign}{formatCurrency(t.amount)}
                    </p>
                    <button
                      onClick={() => remove(t.id)}
                      className="p-2 rounded-md text-muted-foreground hover:bg-secondary hover:text-destructive-foreground"
                      aria-label="Delete transaction"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </CardBody>
                </Card>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
