'use client';

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { Category } from '@/lib/types';

interface CategorySelectProps {
  categories: Category[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export function CategorySelect({ categories, value, onChange, placeholder = 'Select category' }: CategorySelectProps) {
  const parents = categories.filter((c) => !c.parent_id).sort((a, b) => a.sort_order - b.sort_order);

  return (
    <Select value={value || 'none'} onValueChange={(v) => onChange(v === 'none' ? '' : v)}>
      <SelectTrigger>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="none">No category</SelectItem>
        {parents.map((parent) => {
          const children = categories
            .filter((c) => c.parent_id === parent.id)
            .sort((a, b) => a.sort_order - b.sort_order);
          return [
            <SelectItem key={parent.id} value={parent.id} className="font-medium">
              {parent.name}
            </SelectItem>,
            ...children.map((child) => (
              <SelectItem key={child.id} value={child.id} className="pl-6">
                {'  '}{child.name}
              </SelectItem>
            )),
          ];
        })}
      </SelectContent>
    </Select>
  );
}
