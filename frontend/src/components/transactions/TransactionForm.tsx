"use client";

import { useState } from "react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { Input, Label, Select } from "@/components/ui/Input";
import type { Category, Transaction, TxnType } from "@/types";

type Props = {
  categories: Category[];
  initial?: Transaction;
  onClose: () => void;
  onSaved: (t: Transaction) => void;
};

export function TransactionForm({ categories, initial, onClose, onSaved }: Props) {
  const today = new Date().toISOString().slice(0, 10);
  const [form, setForm] = useState({
    date: initial?.date ?? today,
    amount: initial?.amount ?? "",
    description: initial?.description ?? "",
    type: (initial?.type ?? "expense") as TxnType,
    category_id: initial?.category_id != null ? String(initial.category_id) : "",
  });
  const [saving, setSaving] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        date: form.date,
        amount: form.amount,
        description: form.description,
        type: form.type,
        category_id: form.category_id ? parseInt(form.category_id) : null,
      };
      const { data } = initial
        ? await api.put<Transaction>(`/api/transactions/${initial.id}`, payload)
        : await api.post<Transaction>("/api/transactions", payload);
      toast.success(initial ? "Transaction updated" : "Transaction saved");
      onSaved(data);
    } catch (e: any) {
      toast.error(e?.response?.data?.detail ?? "Could not save transaction.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="grid grid-cols-2 gap-3">
      <div className="col-span-2 sm:col-span-1">
        <Label>Date</Label>
        <Input type="date" required value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
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
        <Input type="number" inputMode="decimal" step="0.01" min="0.01" required
          value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} placeholder="0.00" />
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
          placeholder="Coffee, paycheck, rent…" />
      </div>
      <div className="col-span-2 flex gap-2 justify-end pt-2">
        <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
        <Button type="submit" disabled={saving}>{saving ? "Saving…" : initial ? "Save" : "Add"}</Button>
      </div>
    </form>
  );
}
