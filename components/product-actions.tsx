'use client';

import { useState } from 'react';
import { Check } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { Product, ProductOption, ProductOptionValue, SelectedOptions } from '@/lib/types';
import { AddToCartButton } from '@/components/add-to-cart-button';

export function ProductActions({ product, isAffiliate }: { product: Product; isAffiliate: boolean }) {
  const options: ProductOption[] = Array.isArray(product.options) ? product.options
    : Array.isArray(product.colours) && product.colours.length > 0
      ? [{ type: 'Colour', values: product.colours }]
      : [];

  const [selectedOptions, setSelectedOptions] = useState<SelectedOptions>(() => {
    const initial: SelectedOptions = {};
    options.forEach((opt) => {
      if (opt.values.length === 1) {
        initial[opt.type] = opt.values[0];
      }
    });
    return initial;
  });

  function handleSelect(type: string, value: string) {
    const option = options.find((o) => o.type === type);
    if (!option) return;
    const matched = option.values.find((v) => v.name === value);
    if (matched) {
      setSelectedOptions((prev) => ({ ...prev, [type]: matched }));
    }
  }

  if (options.length === 0) {
    return <AddToCartButton product={product} isAffiliate={isAffiliate} />;
  }

  const allSelected = options.every((o) => selectedOptions[o.type]);
  const hasColourOption = options.some((o) => o.type === 'Colour');

  return (
    <div className="space-y-4">
      {options.map((option) => {
        const selected = selectedOptions[option.type];
        const isColourType = option.type.toLowerCase() === 'colour';

        if (isColourType) {
          return (
            <div key={option.type}>
              <Label className="text-sm font-medium text-slate-700 mb-2 block">
                {option.type}{selected ? `: ${selected.name}` : ''}
              </Label>
              <div className="flex flex-wrap gap-2">
                {option.values.map((val) => {
                  const isSelected = selected?.name === val.name;
                  return (
                    <button
                      key={val.name}
                      type="button"
                      title={val.name}
                      onClick={() => handleSelect(option.type, val.name)}
                      className={`relative h-9 w-9 rounded-full border-2 transition-all ${
                        isSelected
                          ? 'border-slate-900 ring-2 ring-slate-900 ring-offset-2 scale-110'
                          : 'border-slate-300 hover:border-slate-500'
                      }`}
                      style={{ backgroundColor: val.hex || '#ccc' }}
                    >
                      {isSelected && (
                        <span className="absolute inset-0 flex items-center justify-center">
                          <Check
                            className="h-4 w-4"
                            style={{ color: isLightColor(val.hex || '#ccc') ? '#000' : '#fff' }}
                          />
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        }

        return (
          <div key={option.type}>
            <Label className="text-sm font-medium text-slate-700 mb-2 block">
              {option.type}{selected ? `: ${selected.name}` : ''}
            </Label>
            <Select
              value={selected?.name || ''}
              onValueChange={(v) => handleSelect(option.type, v)}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder={`Select ${option.type}`} />
              </SelectTrigger>
              <SelectContent>
                {option.values.map((val) => (
                  <SelectItem key={val.name} value={val.name}>
                    {val.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        );
      })}

      <AddToCartButton
        product={product}
        isAffiliate={isAffiliate}
        selectedOptions={allSelected ? selectedOptions : null}
      />
    </div>
  );
}

function isLightColor(hex: string): boolean {
  const c = hex.replace('#', '');
  const r = parseInt(c.substring(0, 2), 16);
  const g = parseInt(c.substring(2, 4), 16);
  const b = parseInt(c.substring(4, 6), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 > 186;
}
