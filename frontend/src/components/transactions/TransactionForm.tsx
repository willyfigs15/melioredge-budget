"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { Card, CardBody } from "@/components/ui/Card";
import { Input, Label, Select } from "@/components/ui/Input";
import type { Category, Transaction, TxnType } from "@/types";

type Props = {
  categories: Category[];
  onClose: () => void;
  onSaved: (t: Transaction) => void;
};

export function TransactionForm({ categories, onClose, onSaved }: Props) {
  const today = new Date().toISOString().slice(0, 10);
  const [form, setForm] = useState({
    date: today,
    amount: "",
    description: "",
    type: "expense" as TxnType,
    category_id: "" as string,
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setErr(null);
    try {
      const { data } = await api.post<Transaction>("/api/transactions", {
        date: form.date,
        amount: form.amount,
        description: form.description,
        type: form.type,
        category_id: form.category_id ? parseInt(form.category_id) : null,
      });
      onSaved(data);
    } catch (e: any) {
      setErr(e?.response?.data?.detail ?? "Could not save transaction.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardBody>
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
          {err && <p className="col-span-2 text-sm text-destructive-foreground">{err}</p>}
          <div className="col-span-2 flex gap-2 justify-end">
            <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={saving}>{saving ? "Saving…" : "Save"}</Button>
          </div>
        </form>
      </CardBody>
    </Card>
  );
}
