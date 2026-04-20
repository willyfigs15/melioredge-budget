"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowDownRight, ArrowUpRight, CalendarClock, Pencil, Play, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { cn, formatCurrency } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { Input, Label, Select } from "@/components/ui/Input";
import { Dialog } from "@/components/ui/Dialog";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import type { Budget, Category, Recurring, TxnType } from "@/types";

function currentPeriod() {
  const d = new Date();
  return { year: d.getFullYear(), month: d.getMonth() + 1 };
}

export default function RecurringPage() {
  const [items, setItems] = useState<Recurring[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [loading, setLoading] = useState(true);

  const [formModal, setFormModal] = useState<{ mode: "create" } | { mode: "edit"; item: Recurring } | null>(null);
  const [delModal, setDelModal] = useState<Recurring | null>(null);
  const [applyModal, setApplyModal] = useState(false);

  const load = async () => {
    const [rRes, bRes] = await Promise.all([
      api.get<Recurring[]>("/api/recurring"),
      api.get<Budget[]>("/api/budgets"),
    ]);
    setItems(rRes.data);
    setBudgets(bRes.data);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const categories: Category[] = useMemo(() => budgets.flatMap((b) => b.categories), [budgets]);
  const catMap = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);

  const toggleActive = async (r: Recurring) => {
    const { data } = await api.patch<Recurring>(`/api/recurring/${r.id}`, { active: !r.active });
    setItems((prev) => prev.map((x) => x.id === r.id ? data : x));
  };

  const active = items.filter((i) => i.active);
  const totals = active.reduce(
    (acc, r) => {
      const a = parseFloat(r.amount);
      if (r.type === "income") acc.income += a; else acc.expense += a;
      return acc;
    },
    { income: 0, expense: 0 }
  );

  return (
    <div className="py-6 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl md:text-3xl font-semibold">Recurring</h1>
          <p className="text-sm text-muted-foreground mt-1">Templates for things that repeat every month.</p>
        </div>
        <div className="flex gap-2">
          {active.length > 0 && (
            <Button size="sm" variant="secondary" onClick={() => setApplyModal(true)}>
              <Play className="h-4 w-4" /> Apply to month
            </Button>
          )}
          <Button size="sm" onClick={() => setFormModal({ mode: "create" })}>
            <Plus className="h-4 w-4" /> New
          </Button>
        </div>
      </div>

      {active.length > 0 && (
        <Card>
          <CardBody className="flex flex-wrap items-center gap-4 text-sm">
            <CalendarClock className="h-5 w-5 text-primary shrink-0" />
            <span className="font-medium">Monthly projection:</span>
            <span className="tabular-nums"><span className="text-primary">+{formatCurrency(totals.income)}</span> in · <span className="text-destructive-foreground">-{formatCurrency(totals.expense)}</span> out</span>
            <span className="ml-auto text-muted-foreground">Net {formatCurrency(totals.income - totals.expense)}</span>
          </CardBody>
        </Card>
      )}

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : items.length === 0 ? (
        <Card>
          <CardBody className="py-10 text-center">
            <p className="font-medium">No recurring transactions yet</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Add rent, paycheck, Netflix — anything that hits every month. Then tap "Apply to month" to insert them.
            </p>
            <Button size="sm" className="mt-4" onClick={() => setFormModal({ mode: "create" })}>
              <Plus className="h-4 w-4" /> Add your first
            </Button>
          </CardBody>
        </Card>
      ) : (
        <Card>
          <CardHeader><CardTitle>Templates</CardTitle></CardHeader>
          <CardBody className="p-0">
            <ul>
              {items.map((r) => {
                const cat = r.category_id ? catMap.get(r.category_id) : null;
                const isIncome = r.type === "income";
                return (
                  <li
                    key={r.id}
                    className={cn(
                      "flex items-center gap-3 p-4 border-t border-border/60 first:border-t-0",
                      !r.active && "opacity-50"
                    )}
                  >
                    <span className={cn(
                      "h-8 w-8 rounded-full flex items-center justify-center shrink-0 ring-1",
                      isIncome
                        ? "bg-primary/15 text-primary ring-primary/30"
                        : "bg-destructive/15 text-destructive-foreground ring-destructive/40"
                    )}>
                      {isIncome ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{r.description || "Untitled recurring"}</p>
                      <p className="text-xs text-muted-foreground">
                        Day {r.day_of_month} · {cat?.name ?? "Uncategorized"}
                      </p>
                    </div>
                    <p className={cn("text-sm font-semibold tabular-nums", isIncome ? "text-primary" : "text-destructive-foreground")}>
                      {isIncome ? "+" : "-"}{formatCurrency(r.amount)}
                    </p>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        className="sr-only peer"
                        checked={r.active}
                        onChange={() => toggleActive(r)}
                      />
                      <div className="w-9 h-5 bg-secondary peer-focus:ring-2 peer-focus:ring-ring rounded-full peer peer-checked:after:translate-x-4 peer-checked:after:border-primary-foreground after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-muted-foreground after:rounded-full after:h-4 after:w-4 after:transition peer-checked:bg-primary peer-checked:after:bg-primary-foreground" />
                    </label>
                    <button
                      onClick={() => setFormModal({ mode: "edit", item: r })}
                      className="p-2 rounded-md text-muted-foreground hover:bg-secondary hover:text-foreground"
                      aria-label="Edit"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => setDelModal(r)}
                      className="p-2 rounded-md text-muted-foreground hover:bg-secondary hover:text-destructive-foreground"
                      aria-label="Delete"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </li>
                );
              })}
            </ul>
          </CardBody>
        </Card>
      )}

      {formModal && (
        <RecurringDialog
          categories={categories}
          initial={formModal.mode === "edit" ? formModal.item : undefined}
          onClose={() => setFormModal(null)}
          onSaved={(r) => {
            if (formModal.mode === "edit") {
              setItems((prev) => prev.map((x) => x.id === r.id ? r : x));
            } else {
              setItems((prev) => [...prev, r]);
            }
            setFormModal(null);
          }}
        />
      )}

      {delModal && (
        <ConfirmDialog
          open={true}
          onClose={() => setDelModal(null)}
          title="Delete recurring?"
          description="Past transactions already created from this template are kept."
          confirmText="Delete"
          destructive
          onConfirm={async () => {
            await api.delete(`/api/recurring/${delModal.id}`);
            setItems((prev) => prev.filter((x) => x.id !== delModal.id));
            toast.success("Deleted");
          }}
        />
      )}

      {applyModal && <ApplyDialog onClose={() => setApplyModal(false)} />}
    </div>
  );
}

function RecurringDialog({
  categories,
  initial,
  onClose,
  onSaved,
}: {
  categories: Category[];
  initial?: Recurring;
  onClose: () => void;
  onSaved: (r: Recurring) => void;
}) {
  const [form, setForm] = useState({
    day_of_month: initial?.day_of_month ?? 1,
    amount: initial?.amount ?? "",
    description: initial?.description ?? "",
    type: (initial?.type ?? "expense") as TxnType,
    category_id: initial?.category_id != null ? String(initial.category_id) : "",
    active: initial?.active ?? true,
    note: initial?.note ?? "",
  });
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const payload = {
        ...form,
        category_id: form.category_id ? parseInt(form.category_id) : null,
      };
      const { data } = initial
        ? await api.patch<Recurring>(`/api/recurring/${initial.id}`, payload)
        : await api.post<Recurring>("/api/recurring", payload);
      toast.success(initial ? "Updated" : "Saved");
      onSaved(data);
    } catch (e: any) {
      toast.error(e?.response?.data?.detail ?? "Could not save.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={true} onClose={onClose} title={initial ? "Edit recurring" : "New recurring"}>
      <form onSubmit={submit} className="grid grid-cols-2 gap-3">
        <div className="col-span-2 sm:col-span-1">
          <Label>Day of month</Label>
          <Input type="number" min={1} max={31} required value={form.day_of_month}
            onChange={(e) => setForm({ ...form, day_of_month: parseInt(e.target.value) })} />
        </div>
        <div className="col-span-2 sm:col-span-1">
          <Label>Type</Label>
          <Select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as TxnType })}>
            <option value="expense">Expense</option>
            <option value="income">Income</option>
          </Select>
        </div>
        <div className="col-span-2 sm:col-span-1">
          <Label>Amount</Label>
          <Input type="number" step="0.01" min="0.01" required value={form.amount}
            onChange={(e) => setForm({ ...form, amount: e.target.value })} placeholder="0.00" />
        </div>
        <div className="col-span-2 sm:col-span-1">
          <Label>Category</Label>
          <Select value={form.category_id} onChange={(e) => setForm({ ...form, category_id: e.target.value })}>
            <option value="">— None —</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </Select>
        </div>
        <div className="col-span-2">
          <Label>Description</Label>
          <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder="Rent, paycheck, Netflix…" />
        </div>
        <div className="col-span-2 flex justify-end gap-2 pt-2">
          <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={busy}>{busy ? "Saving…" : initial ? "Save" : "Add"}</Button>
        </div>
      </form>
    </Dialog>
  );
}

function ApplyDialog({ onClose }: { onClose: () => void }) {
  const p = currentPeriod();
  const [form, setForm] = useState(p);
  const [busy, setBusy] = useState(false);
  const apply = async () => {
    setBusy(true);
    try {
      const { data } = await api.post(`/api/recurring/apply/${form.year}/${form.month}`);
      toast.success(`Applied: ${data.inserted} inserted, ${data.skipped} skipped`);
      onClose();
    } catch (e: any) {
      toast.error(e?.response?.data?.detail ?? "Could not apply.");
    } finally {
      setBusy(false);
    }
  };
  return (
    <Dialog open={true} onClose={onClose} title="Apply recurring" description="Inserts active templates as real transactions for the chosen month. Existing rows are skipped.">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Year</Label>
          <Input type="number" value={form.year} onChange={(e) => setForm({ ...form, year: parseInt(e.target.value) })} />
        </div>
        <div>
          <Label>Month</Label>
          <Input type="number" min={1} max={12} value={form.month} onChange={(e) => setForm({ ...form, month: parseInt(e.target.value) })} />
        </div>
      </div>
      <div className="flex justify-end gap-2 pt-4">
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button onClick={apply} disabled={busy}>{busy ? "Applying…" : "Apply"}</Button>
      </div>
    </Dialog>
  );
}
