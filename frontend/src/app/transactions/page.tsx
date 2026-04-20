"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowDownRight, ArrowUpRight, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { cn, formatCurrency, formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { Card, CardBody } from "@/components/ui/Card";
import { Input, Select } from "@/components/ui/Input";
import { Dialog } from "@/components/ui/Dialog";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { TransactionForm } from "@/components/transactions/TransactionForm";
import type { Budget, Category, Transaction, TxnType } from "@/types";

type FilterType = "all" | TxnType;

export default function TransactionsPage() {
  const [items, setItems] = useState<Transaction[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [loading, setLoading] = useState(true);

  const [formModal, setFormModal] = useState<{ mode: "create" } | { mode: "edit"; txn: Transaction } | null>(null);
  const [delModal, setDelModal] = useState<Transaction | null>(null);

  const [typeFilter, setTypeFilter] = useState<FilterType>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("");
  const [start, setStart] = useState<string>("");
  const [end, setEnd] = useState<string>("");

  const load = async () => {
    const [txRes, bRes] = await Promise.all([
      api.get("/api/transactions", { params: { limit: 500 } }),
      api.get("/api/budgets"),
    ]);
    setItems(txRes.data.items);
    setBudgets(bRes.data);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const categories: Category[] = useMemo(() => budgets.flatMap((b) => b.categories), [budgets]);
  const catMap = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);

  const filtered = items.filter((t) => {
    if (typeFilter !== "all" && t.type !== typeFilter) return false;
    if (categoryFilter) {
      if (categoryFilter === "none" && t.category_id != null) return false;
      if (categoryFilter !== "none" && String(t.category_id) !== categoryFilter) return false;
    }
    if (start && t.date < start) return false;
    if (end && t.date > end) return false;
    return true;
  });

  const totals = filtered.reduce(
    (acc, t) => {
      const a = parseFloat(t.amount);
      if (t.type === "income") acc.income += a; else acc.expense += a;
      return acc;
    },
    { income: 0, expense: 0 }
  );

  return (
    <div className="py-6 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl md:text-3xl font-semibold">Transactions</h1>
        <Button size="sm" onClick={() => setFormModal({ mode: "create" })}>
          <Plus className="h-4 w-4" /> Add
        </Button>
      </div>

      <Card>
        <CardBody className="space-y-3">
          <div className="inline-flex rounded-md border border-border overflow-hidden w-full sm:w-auto">
            {(["all", "income", "expense"] as FilterType[]).map((f) => (
              <button
                key={f}
                onClick={() => setTypeFilter(f)}
                className={cn(
                  "flex-1 sm:flex-none px-4 h-9 text-sm transition-colors",
                  typeFilter === f ? "bg-primary/15 text-primary" : "hover:bg-secondary/60 text-muted-foreground"
                )}
              >
                {f === "all" ? "All" : f === "income" ? "Income" : "Expense"}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <Select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
              <option value="">All categories</option>
              <option value="none">Uncategorized</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </Select>
            <Input type="date" value={start} onChange={(e) => setStart(e.target.value)} placeholder="From" />
            <Input type="date" value={end} onChange={(e) => setEnd(e.target.value)} placeholder="To" />
          </div>
          <div className="flex flex-wrap justify-between gap-2 text-xs text-muted-foreground pt-1">
            <span>{filtered.length} of {items.length} transactions</span>
            <span>
              <span className="text-primary">+{formatCurrency(totals.income)}</span>
              {"  ·  "}
              <span className="text-destructive-foreground">-{formatCurrency(totals.expense)}</span>
            </span>
          </div>
        </CardBody>
      </Card>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : filtered.length === 0 ? (
        <Card>
          <CardBody>
            <p className="text-sm text-muted-foreground">
              {items.length === 0 ? "No transactions yet. Add one, or import a CSV." : "No matches for these filters."}
            </p>
          </CardBody>
        </Card>
      ) : (
        <>
          {/* Desktop table */}
          <Card className="hidden md:block">
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="text-muted-foreground border-b border-border">
                  <tr>
                    <th className="text-left font-medium py-3 px-4">Date</th>
                    <th className="text-left font-medium py-3 px-4">Description</th>
                    <th className="text-left font-medium py-3 px-4">Category</th>
                    <th className="text-left font-medium py-3 px-4">Type</th>
                    <th className="text-right font-medium py-3 px-4">Amount</th>
                    <th className="py-3 px-4" />
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((t) => {
                    const cat = t.category_id ? catMap.get(t.category_id) : null;
                    const isIncome = t.type === "income";
                    return (
                      <tr key={t.id} className="border-b border-border/60 hover:bg-secondary/30 transition">
                        <td className="py-2.5 px-4 whitespace-nowrap text-muted-foreground">{formatDate(t.date)}</td>
                        <td className="py-2.5 px-4">
                          <span className="truncate block max-w-[380px]">
                            {t.description || <span className="text-muted-foreground">Untitled</span>}
                          </span>
                          {t.source !== "manual" && (
                            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{t.source}</span>
                          )}
                        </td>
                        <td className="py-2.5 px-4">
                          {cat ? (
                            <span className="inline-flex items-center gap-2">
                              <span className="h-2 w-2 rounded-full" style={{ background: cat.color }} />
                              {cat.name}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>
                        <td className="py-2.5 px-4">
                          <span className={cn(
                            "inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full",
                            isIncome ? "bg-primary/15 text-primary" : "bg-destructive/15 text-destructive-foreground"
                          )}>
                            {isIncome ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                            {isIncome ? "Income" : "Expense"}
                          </span>
                        </td>
                        <td className={cn("py-2.5 px-4 text-right font-medium tabular-nums", isIncome ? "text-primary" : "text-destructive-foreground")}>
                          {isIncome ? "+" : "-"}{formatCurrency(t.amount)}
                        </td>
                        <td className="py-2.5 px-4">
                          <div className="flex justify-end gap-1">
                            <button
                              onClick={() => setFormModal({ mode: "edit", txn: t })}
                              className="p-1.5 rounded-md text-muted-foreground hover:bg-secondary hover:text-foreground"
                              aria-label="Edit"
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => setDelModal(t)}
                              className="p-1.5 rounded-md text-muted-foreground hover:bg-secondary hover:text-destructive-foreground"
                              aria-label="Delete"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Mobile list */}
          <ul className="space-y-2 md:hidden">
            {filtered.map((t) => {
              const cat = t.category_id ? catMap.get(t.category_id) : null;
              const isIncome = t.type === "income";
              const TypeIcon = isIncome ? ArrowUpRight : ArrowDownRight;
              return (
                <li key={t.id}>
                  <Card>
                    <CardBody className="py-3 flex items-center gap-3">
                      <span
                        className={cn(
                          "h-8 w-8 rounded-full flex items-center justify-center shrink-0 ring-1",
                          isIncome
                            ? "bg-primary/15 text-primary ring-primary/30"
                            : "bg-destructive/15 text-destructive-foreground ring-destructive/40"
                        )}
                      >
                        <TypeIcon className="h-4 w-4" />
                      </span>
                      <button
                        onClick={() => setFormModal({ mode: "edit", txn: t })}
                        className="flex-1 min-w-0 text-left"
                      >
                        <p className="text-sm font-medium truncate">
                          {t.description || <span className="text-muted-foreground">Untitled</span>}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatDate(t.date)} · {cat?.name ?? "Uncategorized"}
                          {t.source !== "manual" && ` · ${t.source}`}
                        </p>
                      </button>
                      <p className={cn("text-sm font-semibold tabular-nums", isIncome ? "text-primary" : "text-destructive-foreground")}>
                        {isIncome ? "+" : "-"}{formatCurrency(t.amount)}
                      </p>
                      <button
                        onClick={() => setDelModal(t)}
                        className="p-2 rounded-md text-muted-foreground hover:bg-secondary hover:text-destructive-foreground"
                        aria-label="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </CardBody>
                  </Card>
                </li>
              );
            })}
          </ul>
        </>
      )}

      {formModal && (
        <Dialog
          open={true}
          onClose={() => setFormModal(null)}
          title={formModal.mode === "edit" ? "Edit transaction" : "New transaction"}
        >
          <TransactionForm
            categories={categories}
            initial={formModal.mode === "edit" ? formModal.txn : undefined}
            onClose={() => setFormModal(null)}
            onSaved={(t) => {
              if (formModal.mode === "edit") {
                setItems((prev) => prev.map((x) => x.id === t.id ? t : x));
              } else {
                setItems((prev) => [t, ...prev]);
              }
              setFormModal(null);
            }}
          />
        </Dialog>
      )}

      {delModal && (
        <ConfirmDialog
          open={true}
          onClose={() => setDelModal(null)}
          title="Delete this transaction?"
          description={delModal.description || "Untitled transaction"}
          confirmText="Delete"
          destructive
          onConfirm={async () => {
            await api.delete(`/api/transactions/${delModal.id}`);
            setItems((prev) => prev.filter((x) => x.id !== delModal.id));
            toast.success("Transaction deleted");
          }}
        />
      )}
    </div>
  );
}
