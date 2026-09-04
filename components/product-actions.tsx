'use client';

import { useState, useMemo } from 'react';
import { Check } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { Product, ProductOption, ProductOptionValue, SelectedOptions, VariantStock } from '@/lib/types';
import { AddToCartButton } from '@/components/add-to-cart-button';

function variantKey(opts: SelectedOptions): string {
  return Object.entries(opts)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v.name}`)
    .join(':');
}

function getVariantStock(
  variantStock: VariantStock | undefined,
  selected: SelectedOptions
): { stock: number; sku: string } | null {
  if (!variantStock || Object.keys(variantStock).length === 0) return null;
  const key = variantKey(selected);
  return variantStock[key] || null;
}

const QUICK_SIZES = ['S', 'M', 'L', 'XL', 'XXL', 'XXXL'];

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

  // Compute which option values are in stock based on variant_stock
  const inStockValues = useMemo(() => {
    if (!product.variant_stock || Object.keys(product.variant_stock).length === 0) {
      return null; // No variant-level stock data — all values available
    }

    const result: Record<string, Set<string>> = {};
    for (const option of options) {
      result[option.type] = new Set();
      for (const val of option.values) {
        // Check if any variant combination with this value has stock > 0
        const testOpts = { ...selectedOptions, [option.type]: val };
        const vs = getVariantStock(product.variant_stock, testOpts);
        if (vs) {
          if (vs.stock > 0) {
            result[option.type].add(val.name);
          }
        } else {
          // No variant data for this combo — allow it
          result[option.type].add(val.name);
        }
      }
    }
    return result;
  }, [product.variant_stock, options, selectedOptions]);

  // Check if current selection is a valid in-stock variant
  const currentVariant = useMemo(() => {
    if (Object.keys(selectedOptions).length === 0) return null;
    return getVariantStock(product.variant_stock, selectedOptions);
  }, [product.variant_stock, selectedOptions]);

  if (options.length === 0) {
    return <AddToCartButton product={product} isAffiliate={isAffiliate} />;
  }

  const allSelected = options.every((o) => selectedOptions[o.type]);

  // Is the current selection out of stock?
  const isCurrentOOS = currentVariant !== null && currentVariant.stock <= 0;

  return (
    <div className="space-y-4">
      {options.map((option) => {
        const selected = selectedOptions[option.type];
        const isColourType = option.type.toLowerCase() === 'colour';
        const isSizeType = option.type.toLowerCase() === 'size';
        const availableNames = inStockValues?.[option.type];

        if (isColourType) {
          return (
            <div key={option.type}>
              <Label className="text-sm font-medium text-slate-700 mb-2 block">
                {option.type}{selected ? `: ${selected.name}` : ''}
              </Label>
              <div className="flex flex-wrap gap-2">
                {option.values.map((val) => {
                  const isSelected = selected?.name === val.name;
                  const isOOS = availableNames && !availableNames.has(val.name);
                  return (
                    <button
                      key={val.name}
                      type="button"
                      title={isOOS ? `${val.name} — Out of stock` : val.name}
                      onClick={() => !isOOS && handleSelect(option.type, val.name)}
                      disabled={!!isOOS}
                      className={`relative h-9 w-9 rounded-full border-2 transition-all ${
                        isSelected
                          ? 'border-slate-900 ring-2 ring-slate-900 ring-offset-2 scale-110'
                          : isOOS
                            ? 'border-slate-200 opacity-40 cursor-not-allowed'
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

        // Size option — use quick-select buttons if values match common sizes
        if (isSizeType) {
          const useButtons = option.values.every((v) =>
            QUICK_SIZES.includes(v.name.toUpperCase())
          );

          if (useButtons) {
            return (
              <div key={option.type}>
                <Label className="text-sm font-medium text-slate-700 mb-2 block">
                  {option.type}{selected ? `: ${selected.name}` : ''}
                </Label>
                <div className="flex flex-wrap gap-2">
                  {option.values.map((val) => {
                    const isSelected = selected?.name === val.name;
                    const isOOS = availableNames && !availableNames.has(val.name);
                    return (
                      <button
                        key={val.name}
                        type="button"
                        onClick={() => !isOOS && handleSelect(option.type, val.name)}
                        disabled={!!isOOS}
                        className={`h-10 min-w-[2.5rem] px-3 rounded-md border-2 text-sm font-medium transition-all ${
                          isSelected
                            ? 'border-slate-900 bg-slate-900 text-white'
                            : isOOS
                              ? 'border-slate-200 text-slate-300 cursor-not-allowed line-through'
                              : 'border-slate-300 text-slate-700 hover:border-slate-500'
                        }`}
                      >
                        {val.name}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          }
        }

        // Generic option — dropdown
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
                {option.values.map((val) => {
                  const isOOS = availableNames && !availableNames.has(val.name);
                  return (
                    <SelectItem key={val.name} value={val.name} disabled={!!isOOS}>
                      {val.name}{isOOS ? ' (Out of stock)' : ''}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>
        );
      })}

      {allSelected && isCurrentOOS && (
        <p className="text-sm text-red-600 font-medium">This combination is out of stock.</p>
      )}

      <AddToCartButton
        product={product}
        isAffiliate={isAffiliate}
        selectedOptions={allSelected ? selectedOptions : null}
        variantSku={currentVariant?.sku || null}
        disabled={!allSelected || isCurrentOOS}
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
