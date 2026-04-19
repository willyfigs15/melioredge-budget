"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";
import { api } from "@/lib/api";
import { formatCurrency, monthLabel } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { Input, Label } from "@/components/ui/Input";
import type { Budget, Category } from "@/types";

const COLORS = ["#22c55e", "#3b82f6", "#f59e0b", "#ef4444", "#a855f7", "#14b8a6", "#ec4899", "#eab308"];

export default function BudgetDetailPage({ params }: { params: { id: string } }) {
  const { id } = params;
  const router = useRouter();
  const [budget, setBudget] = useState<Budget | null>(null);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ name: "", limit_amount: "", color: COLORS[0] });

  const load = async () => {
    const { data } = await api.get<Budget>(`/api/budgets/${id}`);
    setBudget(data);
  };

  useEffect(() => { load(); }, [id]);

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    await api.post<Category>(`/api/budgets/${id}/categories`, {
      name: form.name,
      limit_amount: form.limit_amount,
      color: form.color,
      icon: "Wallet",
      sort_order: budget?.categories.length ?? 0,
    });
    setForm({ name: "", limit_amount: "", color: COLORS[0] });
    setAdding(false);
    load();
  };

  const removeCat = async (cid: number) => {
    if (!confirm("Delete this category?")) return;
    await api.delete(`/api/budgets/${id}/categories/${cid}`);
    load();
  };

  const removeBudget = async () => {
    if (!confirm("Delete this budget and its categories?")) return;
    await api.delete(`/api/budgets/${id}`);
    router.push("/budgets");
  };

  if (!budget) return <p className="py-6 text-sm text-muted-foreground">Loading…</p>;

  const total = budget.categories.reduce((s, c) => s + parseFloat(c.limit_amount || "0"), 0);

  return (
    <div className="py-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">{monthLabel(budget.year, budget.month)}</p>
          <h1 className="text-2xl font-semibold">{budget.name || "Monthly Budget"}</h1>
        </div>
        <Button variant="ghost" size="sm" onClick={removeBudget}>Delete</Button>
      </div>

      <Card>
        <CardHeader className="flex items-center justify-between">
          <CardTitle>Categories</CardTitle>
          <Button size="sm" variant="secondary" onClick={() => setAdding((v) => !v)}>
            <Plus className="h-4 w-4" /> Add
          </Button>
        </CardHeader>
        <CardBody>
          {adding && (
            <form onSubmit={add} className="grid grid-cols-2 gap-3 pb-4 mb-4 border-b border-border">
              <div className="col-span-2 sm:col-span-1">
                <Label>Name</Label>
                <Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Rent, Food…" />
              </div>
              <div className="col-span-2 sm:col-span-1">
                <Label>Limit</Label>
                <Input type="number" step="0.01" min="0" required value={form.limit_amount}
                  onChange={(e) => setForm({ ...form, limit_amount: e.target.value })} placeholder="0.00" />
              </div>
              <div className="col-span-2">
                <Label>Color</Label>
                <div className="flex gap-2 mt-1 flex-wrap">
                  {COLORS.map((c) => (
                    <button
                      key={c} type="button"
                      onClick={() => setForm({ ...form, color: c })}
                      className={`h-8 w-8 rounded-full ring-2 ${form.color === c ? "ring-primary" : "ring-transparent"}`}
                      style={{ background: c }}
                      aria-label={`Choose color ${c}`}
                    />
                  ))}
                </div>
              </div>
              <div className="col-span-2 flex justify-end gap-2">
                <Button type="button" variant="ghost" onClick={() => setAdding(false)}>Cancel</Button>
                <Button type="submit">Add</Button>
              </div>
            </form>
          )}

          {budget.categories.length === 0 ? (
            <p className="text-sm text-muted-foreground">No categories yet. Add Rent, Food, Utilities, etc.</p>
          ) : (
            <ul className="space-y-2">
              {budget.categories.map((c) => (
                <li key={c.id} className="flex items-center gap-3 py-2">
                  <span className="h-3 w-3 rounded-full shrink-0" style={{ background: c.color }} />
                  <span className="flex-1 text-sm">{c.name}</span>
                  <span className="text-sm tabular-nums">{formatCurrency(c.limit_amount)}</span>
                  <button onClick={() => removeCat(c.id)} className="p-2 rounded-md text-muted-foreground hover:bg-secondary hover:text-destructive-foreground" aria-label="Delete category">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}

          {budget.categories.length > 0 && (
            <div className="mt-4 pt-4 border-t border-border flex justify-between text-sm">
              <span className="text-muted-foreground">Monthly limit total</span>
              <span className="font-semibold tabular-nums">{formatCurrency(total)}</span>
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
