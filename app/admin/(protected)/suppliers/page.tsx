'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Pencil, Trash2, Power, PowerOff, ExternalLink, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { createClient } from '@/lib/supabase/client';
import type { Supplier } from '@/lib/types';

export default function SuppliersPage() {
  const router = useRouter();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    name: '',
    website: '',
    contact_name: '',
    contact_email: '',
    contact_phone: '',
    product_url: '',
    notes: '',
  });

  useEffect(() => {
    fetchSuppliers();
  }, []);

  async function fetchSuppliers() {
    const supabase = createClient();
    const { data } = await supabase.from('suppliers').select('*').order('created_at', { ascending: false });
    setSuppliers((data as Supplier[]) || []);
    setLoading(false);
  }

  function openDialog(supplier?: Supplier) {
    if (supplier) {
      setEditingSupplier(supplier);
      setForm({
        name: supplier.name,
        website: supplier.website || '',
        contact_name: supplier.contact_name || '',
        contact_email: supplier.contact_email || '',
        contact_phone: supplier.contact_phone || '',
        product_url: supplier.product_url || '',
        notes: supplier.notes || '',
      });
    } else {
      setEditingSupplier(null);
      setForm({ name: '', website: '', contact_name: '', contact_email: '', contact_phone: '', product_url: '', notes: '' });
    }
    setDialogOpen(true);
  }

  async function handleSave() {
    setSaving(true);
    setError('');
    const supabase = createClient();

    const payload = {
      name: form.name,
      website: form.website || null,
      contact_name: form.contact_name || null,
      contact_email: form.contact_email || null,
      contact_phone: form.contact_phone || null,
      product_url: form.product_url || null,
      notes: form.notes || null,
    };

    if (!form.name) {
      setError('Supplier name is required.');
      setSaving(false);
      return;
    }

    if (editingSupplier) {
      const { error: err } = await supabase.from('suppliers').update(payload).eq('id', editingSupplier.id);
      if (err) { setError(err.message); setSaving(false); return; }
    } else {
      const { error: err } = await supabase.from('suppliers').insert(payload);
      if (err) { setError(err.message); setSaving(false); return; }
    }

    setDialogOpen(false);
    setSaving(false);
    fetchSuppliers();
  }

  async function handleToggleActive(supplier: Supplier) {
    const supabase = createClient();
    await supabase.from('suppliers').update({ active: !supplier.active }).eq('id', supplier.id);
    fetchSuppliers();
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this supplier? This cannot be undone.')) return;
    const supabase = createClient();
    await supabase.from('suppliers').delete().eq('id', id);
    fetchSuppliers();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Suppliers</h1>
          <p className="text-sm text-slate-500">Manage your dropshipping suppliers</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => openDialog()} className="gap-1">
              <Plus className="h-4 w-4" />
              Add Supplier
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editingSupplier ? 'Edit Supplier' : 'Add Supplier'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              {error && <div className="rounded-md bg-red-50 p-3 text-sm text-red-600">{error}</div>}
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label>Supplier Name *</Label>
                  <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                </div>
                <div>
                  <Label>Website</Label>
                  <Input value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} placeholder="https://..." />
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <Label>Contact Name</Label>
                  <Input value={form.contact_name} onChange={(e) => setForm({ ...form, contact_name: e.target.value })} />
                </div>
                <div>
                  <Label>Contact Email</Label>
                  <Input type="email" value={form.contact_email} onChange={(e) => setForm({ ...form, contact_email: e.target.value })} />
                </div>
                <div>
                  <Label>Contact Phone</Label>
                  <Input value={form.contact_phone} onChange={(e) => setForm({ ...form, contact_phone: e.target.value })} />
                </div>
              </div>
              <div>
                <Label>Supplier Product URL</Label>
                <Input value={form.product_url} onChange={(e) => setForm({ ...form, product_url: e.target.value })} placeholder="https://..." />
              </div>
              <div>
                <Label>Notes</Label>
                <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={3} />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                <Button onClick={handleSave} disabled={saving}>
                  {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
                  {editingSupplier ? 'Update' : 'Create'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
        </div>
      ) : suppliers.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-slate-500">No suppliers yet. Add your first supplier to get started.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {suppliers.map((supplier) => (
            <Card key={supplier.id} className={!supplier.active ? 'opacity-60' : ''}>
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-slate-900">{supplier.name}</h3>
                    {supplier.website && (
                      <a href={supplier.website} target="_blank" rel="noopener noreferrer" className="text-xs text-sky-600 hover:underline flex items-center gap-1">
                        {supplier.website} <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </div>
                  <Badge variant={supplier.active ? 'default' : 'secondary'}>
                    {supplier.active ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
                {supplier.contact_name && (
                  <p className="mt-2 text-sm text-slate-600">Contact: {supplier.contact_name}</p>
                )}
                {supplier.contact_email && (
                  <p className="text-sm text-slate-600">Email: {supplier.contact_email}</p>
                )}
                {supplier.notes && (
                  <p className="mt-2 text-xs text-slate-500 line-clamp-2">{supplier.notes}</p>
                )}
                <div className="mt-4 flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => openDialog(supplier)}>
                    <Pencil className="h-3 w-3 mr-1" /> Edit
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => handleToggleActive(supplier)}>
                    {supplier.active ? <PowerOff className="h-3 w-3 mr-1" /> : <Power className="h-3 w-3 mr-1" />}
                    {supplier.active ? 'Disable' : 'Enable'}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => handleDelete(supplier.id)} className="text-red-500 hover:text-red-600 ml-auto">
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
