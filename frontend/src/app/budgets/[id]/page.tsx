"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Plus, Sparkles, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { formatCurrency, monthLabel } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { Input, Label } from "@/components/ui/Input";
import { Dialog } from "@/components/ui/Dialog";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { STARTER_CATEGORIES } from "@/lib/templates";
import type { Budget, Category } from "@/types";

const COLORS = ["#22c55e", "#3b82f6", "#f59e0b", "#ef4444", "#a855f7", "#14b8a6", "#ec4899", "#eab308"];

export default function BudgetDetailPage({ params }: { params: { id: string } }) {
  const { id } = params;
  const router = useRouter();
  const [budget, setBudget] = useState<Budget | null>(null);
  const [catModal, setCatModal] = useState<{ mode: "create" } | { mode: "edit"; cat: Category } | null>(null);
  const [renameOpen, setRenameOpen] = useState(false);
  const [confirmDel, setConfirmDel] = useState<{ kind: "budget" } | { kind: "category"; cat: Category } | null>(null);

  const load = async () => {
    const { data } = await api.get<Budget>(`/api/budgets/${id}`);
    setBudget(data);
  };

  useEffect(() => { load(); }, [id]);

  const seedStarter = async () => {
    if (!budget) return;
    for (const [i, c] of STARTER_CATEGORIES.entries()) {
      await api.post(`/api/budgets/${budget.id}/categories`, { ...c, sort_order: i });
    }
    toast.success("Starter categories added");
    load();
  };

  if (!budget) return <p className="py-6 text-sm text-muted-foreground">Loading…</p>;

  const total = budget.categories.reduce((s, c) => s + parseFloat(c.limit_amount || "0"), 0);

  return (
    <div className="py-6 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">{monthLabel(budget.year, budget.month)}</p>
          <div className="flex items-center gap-2 mt-1">
            <h1 className="text-2xl md:text-3xl font-semibold truncate">{budget.name || "Monthly Budget"}</h1>
            <button
              onClick={() => setRenameOpen(true)}
              className="p-1.5 rounded-md text-muted-foreground hover:bg-secondary hover:text-foreground"
              aria-label="Rename"
            >
              <Pencil className="h-4 w-4" />
            </button>
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={() => setConfirmDel({ kind: "budget" })}>
          Delete
        </Button>
      </div>

      <Card>
        <CardHeader className="flex items-center justify-between">
          <CardTitle>Categories</CardTitle>
          <Button size="sm" variant="secondary" onClick={() => setCatModal({ mode: "create" })}>
            <Plus className="h-4 w-4" /> Add
          </Button>
        </CardHeader>
        <CardBody>
          {budget.categories.length === 0 ? (
            <div className="py-6 text-center space-y-3">
              <p className="text-sm text-muted-foreground">No categories yet.</p>
              <div className="flex justify-center gap-2">
                <Button variant="secondary" size="sm" onClick={seedStarter}>
                  <Sparkles className="h-4 w-4" /> Use starter template
                </Button>
                <Button size="sm" onClick={() => setCatModal({ mode: "create" })}>
                  <Plus className="h-4 w-4" /> Add manually
                </Button>
              </div>
            </div>
          ) : (
            <ul className="space-y-1">
              {budget.categories.map((c) => (
                <li key={c.id} className="flex items-center gap-3 py-2 px-1 rounded-md hover:bg-secondary/40 transition">
                  <span className="h-3 w-3 rounded-full shrink-0" style={{ background: c.color }} />
                  <span className="flex-1 text-sm truncate">{c.name}</span>
                  <span className="text-sm tabular-nums text-muted-foreground">{formatCurrency(c.limit_amount)}</span>
                  <button
                    onClick={() => setCatModal({ mode: "edit", cat: c })}
                    className="p-2 rounded-md text-muted-foreground hover:bg-secondary hover:text-foreground"
                    aria-label="Edit"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setConfirmDel({ kind: "category", cat: c })}
                    className="p-2 rounded-md text-muted-foreground hover:bg-secondary hover:text-destructive-foreground"
                    aria-label="Delete"
                  >
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

      {catModal && (
        <CategoryDialog
          budgetId={budget.id}
          initial={catModal.mode === "edit" ? catModal.cat : undefined}
          onClose={() => setCatModal(null)}
          onSaved={() => { setCatModal(null); load(); }}
        />
      )}

      {renameOpen && (
        <RenameBudgetDialog
          budget={budget}
          onClose={() => setRenameOpen(false)}
          onSaved={(b) => { setBudget(b); setRenameOpen(false); toast.success("Renamed"); }}
        />
      )}

      {confirmDel && (
        <ConfirmDialog
          open={true}
          onClose={() => setConfirmDel(null)}
          title={confirmDel.kind === "budget" ? "Delete this budget?" : "Delete this category?"}
          description={
            confirmDel.kind === "budget"
              ? "This removes the budget and all its categories. Transactions are kept."
              : "Transactions in this category will become uncategorized."
          }
          confirmText="Delete"
          destructive
          onConfirm={async () => {
            if (confirmDel.kind === "budget") {
              await api.delete(`/api/budgets/${budget.id}`);
              toast.success("Budget deleted");
              router.push("/budgets");
            } else {
              await api.delete(`/api/budgets/${budget.id}/categories/${confirmDel.cat.id}`);
              toast.success("Category deleted");
              load();
            }
          }}
        />
      )}
    </div>
  );
}

function CategoryDialog({
  budgetId,
  initial,
  onClose,
  onSaved,
}: {
  budgetId: number;
  initial?: Category;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({
    name: initial?.name ?? "",
    limit_amount: initial?.limit_amount ?? "",
    color: initial?.color ?? COLORS[0],
    icon: initial?.icon ?? "Wallet",
    sort_order: initial?.sort_order ?? 0,
  });
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (initial) {
        await api.put(`/api/budgets/${budgetId}/categories/${initial.id}`, form);
        toast.success("Category updated");
      } else {
        await api.post(`/api/budgets/${budgetId}/categories`, form);
        toast.success("Category added");
      }
      onSaved();
    } catch (e: any) {
      toast.error(e?.response?.data?.detail ?? "Could not save.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={true} onClose={onClose} title={initial ? "Edit category" : "New category"}>
      <form onSubmit={submit} className="grid grid-cols-2 gap-3">
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
        <div className="col-span-2 flex justify-end gap-2 pt-2">
          <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={busy}>{busy ? "Saving…" : initial ? "Save" : "Add"}</Button>
        </div>
      </form>
    </Dialog>
  );
}

function RenameBudgetDialog({ budget, onClose, onSaved }: { budget: Budget; onClose: () => void; onSaved: (b: Budget) => void }) {
  const [name, setName] = useState(budget.name);
  const [busy, setBusy] = useState(false);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const { data } = await api.patch<Budget>(`/api/budgets/${budget.id}`, { name });
      onSaved(data);
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
