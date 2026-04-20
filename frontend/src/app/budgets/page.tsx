"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Copy, Pencil, Plus } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { formatCurrency, monthLabel } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { Card, CardBody } from "@/components/ui/Card";
import { Input, Label } from "@/components/ui/Input";
import { Dialog } from "@/components/ui/Dialog";
import { MonthSelector } from "@/components/MonthSelector";
import type { Budget } from "@/types";

function nowPeriod() {
  const d = new Date();
  return { year: d.getFullYear(), month: d.getMonth() + 1 };
}

export default function BudgetsPage() {
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [dupOpen, setDupOpen] = useState<{ source: Budget } | null>(null);
  const [renameOpen, setRenameOpen] = useState<{ budget: Budget } | null>(null);

  const load = async () => {
    const { data } = await api.get<Budget[]>("/api/budgets");
    setBudgets(data);
  };

  useEffect(() => { load(); }, []);

  return (
    <div className="py-6 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl md:text-3xl font-semibold">Budgets</h1>
        <div className="flex gap-2">
          {budgets[0] && (
            <Button size="sm" variant="secondary" onClick={() => setDupOpen({ source: budgets[0] })}>
              <Copy className="h-4 w-4" /> Duplicate last
            </Button>
          )}
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" /> New
          </Button>
        </div>
      </div>

      {budgets.length === 0 ? (
        <Card>
          <CardBody className="py-10 text-center">
            <p className="font-medium">No budgets yet</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Create one for the current month to start tracking.
            </p>
            <Button size="sm" className="mt-4" onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4" /> Create budget
            </Button>
          </CardBody>
        </Card>
      ) : (
        <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {budgets.map((b) => {
            const total = b.categories.reduce((s, c) => s + parseFloat(c.limit_amount || "0"), 0);
            return (
              <li key={b.id} className="relative group">
                <Link href={`/budgets/${b.id}`} className="block">
                  <Card className="hover:bg-secondary/30 transition">
                    <CardBody>
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">{monthLabel(b.year, b.month)}</p>
                      <p className="mt-1 font-medium truncate">{b.name || "Monthly Budget"}</p>
                      <div className="mt-3 flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">{b.categories.length} categories</span>
                        <span className="tabular-nums">{formatCurrency(total)}</span>
                      </div>
                    </CardBody>
                  </Card>
                </Link>
                <button
                  onClick={(e) => { e.preventDefault(); setRenameOpen({ budget: b }); }}
                  className="absolute right-3 top-3 p-1.5 rounded-md bg-background/80 border border-border opacity-0 group-hover:opacity-100 transition text-muted-foreground hover:text-foreground"
                  aria-label="Rename"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <CreateBudgetDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={(b) => { setBudgets((prev) => [b, ...prev]); toast.success("Budget created"); }}
      />
      {dupOpen && (
        <DuplicateDialog
          source={dupOpen.source}
          onClose={() => setDupOpen(null)}
          onCreated={(b) => { setBudgets((prev) => [b, ...prev]); toast.success("Duplicated"); }}
        />
      )}
      {renameOpen && (
        <RenameDialog
          budget={renameOpen.budget}
          onClose={() => setRenameOpen(null)}
          onSaved={(b) => { setBudgets((prev) => prev.map((x) => x.id === b.id ? b : x)); toast.success("Renamed"); }}
        />
      )}
    </div>
  );
}

function CreateBudgetDialog({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: (b: Budget) => void }) {
  const { year, month } = nowPeriod();
  const [form, setForm] = useState({ year, month, name: "", projected_income: "" });
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const { data } = await api.post<Budget>("/api/budgets", {
        ...form,
        projected_income: form.projected_income || "0",
      });
      onCreated(data);
      onClose();
    } catch (e: any) {
      toast.error(e?.response?.data?.detail ?? "Could not create budget.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} title="New budget">
      <form onSubmit={submit} className="grid grid-cols-2 gap-3">
        <div>
          <Label>Year</Label>
          <Input type="number" value={form.year} onChange={(e) => setForm({ ...form, year: parseInt(e.target.value) })} />
        </div>
        <div>
          <Label>Month</Label>
          <Input type="number" min={1} max={12} value={form.month} onChange={(e) => setForm({ ...form, month: parseInt(e.target.value) })} />
        </div>
        <div className="col-span-2">
          <Label>Name (optional)</Label>
          <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="April 2026" />
        </div>
        <div className="col-span-2">
          <Label>Projected income (optional)</Label>
          <Input
            type="number"
            step="0.01"
            min="0"
            value={form.projected_income}
            onChange={(e) => setForm({ ...form, projected_income: e.target.value })}
            placeholder="0.00"
          />
        </div>
        <div className="col-span-2 flex justify-end gap-2 pt-2">
          <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={busy}>{busy ? "Creating…" : "Create"}</Button>
        </div>
      </form>
    </Dialog>
  );
}

function DuplicateDialog({ source, onClose, onCreated }: { source: Budget; onClose: () => void; onCreated: (b: Budget) => void }) {
  const next = (() => {
    const total = source.year * 12 + (source.month - 1) + 1;
    return { year: Math.floor(total / 12), month: (total % 12) + 1 };
  })();
  const [form, setForm] = useState({ year: next.year, month: next.month, name: source.name });
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const { data } = await api.post<Budget>("/api/budgets/duplicate", {
        source_budget_id: source.id,
        year: form.year,
        month: form.month,
        name: form.name,
      });
      onCreated(data);
      onClose();
    } catch (e: any) {
      toast.error(e?.response?.data?.detail ?? "Could not duplicate.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={true} onClose={onClose} title="Duplicate budget" description={`Clones ${source.categories.length} categories from ${monthLabel(source.year, source.month)}.`}>
      <form onSubmit={submit} className="grid grid-cols-2 gap-3">
        <div>
          <Label>Year</Label>
          <Input type="number" value={form.year} onChange={(e) => setForm({ ...form, year: parseInt(e.target.value) })} />
        </div>
        <div>
          <Label>Month</Label>
          <Input type="number" min={1} max={12} value={form.month} onChange={(e) => setForm({ ...form, month: parseInt(e.target.value) })} />
        </div>
        <div className="col-span-2">
          <Label>Name (optional)</Label>
          <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </div>
        <div className="col-span-2 flex justify-end gap-2 pt-2">
          <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={busy}>{busy ? "Duplicating…" : "Duplicate"}</Button>
        </div>
      </form>
    </Dialog>
  );
}

function RenameDialog({ budget, onClose, onSaved }: { budget: Budget; onClose: () => void; onSaved: (b: Budget) => void }) {
  const [name, setName] = useState(budget.name);
  const [busy, setBusy] = useState(false);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const { data } = await api.patch<Budget>(`/api/budgets/${budget.id}`, { name });
      onSaved(data);
      onClose();
    } catch (e: any) {
      toast.error(e?.response?.data?.detail ?? "Could not rename.");
    } finally {
      setBusy(false);
    }
  };
  return (
    <Dialog open={true} onClose={onClose} title="Rename budget">
      <form onSubmit={submit} className="space-y-3">
        <div>
          <Label>Name</Label>
          <Input value={name} autoFocus onChange={(e) => setName(e.target.value)} placeholder="April 2026" />
        </div>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={busy}>{busy ? "Saving…" : "Save"}</Button>
        </div>
      </form>
    </Dialog>
  );
}
