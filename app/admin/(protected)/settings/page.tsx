'use client';

import { useState } from 'react';
import { Loader2, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function SettingsPage() {
  const [saving, setSaving] = useState(false);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
        <p className="text-sm text-slate-500">Store configuration and payment settings</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Store Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label>Store Name</Label>
              <Input defaultValue="Everything Store" disabled />
            </div>
            <div>
              <Label>Currency</Label>
              <Input defaultValue="ZAR" disabled />
            </div>
          </div>
          <div>
            <Label>Store URL</Label>
            <Input defaultValue="https://digitalvaultsa.co.za" disabled />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>PayFast Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-slate-500">
            PayFast payment gateway is configured via environment variables.
            Contact your developer to update these settings.
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label>Merchant ID</Label>
              <Input type="password" value="***configured***" disabled />
            </div>
            <div>
              <Label>Merchant Key</Label>
              <Input type="password" value="***configured***" disabled />
            </div>
          </div>
          <div>
            <Label>Environment</Label>
            <Input value={process.env.PAYFAST_SANDBOX === 'true' ? 'Sandbox (Testing)' : 'Production'} disabled />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Payment Fee Calculation</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-slate-500">
            PayFast charges: <strong>3.5% + R2.00</strong> per transaction (minimum R5.00).
            These fees are automatically calculated and tracked in the profit dashboard.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
