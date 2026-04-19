"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { api } from "@/lib/api";
import { formatCurrency, monthLabel } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { Card, CardBody } from "@/components/ui/Card";
import { Input, Label } from "@/components/ui/Input";
import type { Budget } from "@/types";

export default function BudgetsPage() {
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [creating, setCreating] = useState(false);
  const now = new Date();
  const [form, setForm] = useState({ year: now.getFullYear(), month: now.getMonth() + 1, name: "" });
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    api.get<Budget[]>("/api/budgets").then((r) => setBudgets(r.data));
  }, []);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    try {
      const { data } = await api.post<Budget>("/api/budgets", form);
      setBudgets((prev) => [data, ...prev]);
      setCreating(false);
    } catch (e: any) {
      setErr(e?.response?.data?.detail ?? "Could not create budget.");
    }
  };

  return (
    <div className="py-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Budgets</h1>
        <Button size="sm" onClick={() => setCreating((v) => !v)}>
          <Plus className="h-4 w-4" /> New
        </Button>
      </div>

      {creating && (
        <Card>
          <CardBody>
            <form onSubmit={create} className="grid grid-cols-3 gap-3">
              <div>
                <Label>Year</Label>
                <Input type="number" value={form.year} onChange={(e) => setForm({ ...form, year: parseInt(e.target.value) })} />
              </div>
              <div>
                <Label>Month</Label>
                <Input type="number" min={1} max={12} value={form.month} onChange={(e) => setForm({ ...form, month: parseInt(e.target.value) })} />
              </div>
              <div>
                <Label>Name</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Optional" />
              </div>
              {err && <p className="col-span-3 text-sm text-destructive-foreground">{err}</p>}
              <div className="col-span-3 flex justify-end gap-2">
                <Button type="button" variant="ghost" onClick={() => setCreating(false)}>Cancel</Button>
                <Button type="submit">Create</Button>
              </div>
            </form>
          </CardBody>
        </Card>
      )}

      {budgets.length === 0 ? (
        <Card><CardBody><p className="text-sm text-muted-foreground">No budgets yet. Create one for the current month.</p></CardBody></Card>
      ) : (
        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {budgets.map((b) => {
            const total = b.categories.reduce((s, c) => s + parseFloat(c.limit_amount || "0"), 0);
            return (
              <li key={b.id}>
                <Link href={`/budgets/${b.id}`} className="block">
                  <Card className="hover:bg-secondary/30 transition">
                    <CardBody>
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">{monthLabel(b.year, b.month)}</p>
                      <p className="mt-1 font-medium">{b.name || "Monthly Budget"}</p>
                      <div className="mt-3 flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">{b.categories.length} categories</span>
                        <span className="tabular-nums">{formatCurrency(total)}</span>
                      </div>
                    </CardBody>
                  </Card>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
