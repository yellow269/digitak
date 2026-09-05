'use client';

import { useState, useMemo } from 'react';
import { Check } from 'lucide-react';
import type { Product, ProductOption, SelectedOptions, VariantStock } from '@/lib/types';
import { AddToCartButton } from '@/components/add-to-cart-button';

const SIZE_SORT_ORDER = [
  'XXS', 'XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL', '4XL', '5XL',
  '24', '26', '28', '30', '32', '34', '36', '38', '40', '42', '44', '46', '48',
];

function sortOptionValues(values: { name: string; hex?: string }[], optionType: string): { name: string; hex?: string }[] {
  if (optionType.toLowerCase() !== 'size') return values;
  return [...values].sort((a, b) => {
    const ai = SIZE_SORT_ORDER.indexOf(a.name.toUpperCase());
    const bi = SIZE_SORT_ORDER.indexOf(b.name.toUpperCase());
    if (ai !== -1 && bi !== -1) return ai - bi;
    if (ai !== -1) return -1;
    if (bi !== -1) return 1;
    const numA = parseInt(a.name);
    const numB = parseInt(b.name);
    if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
    return a.name.localeCompare(b.name);
  });
}

function buildVariantKey(opts: SelectedOptions): string {
  return Object.entries(opts)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v.name}`)
    .join(':');
}

function getVariantStock(
  variantStock: VariantStock | undefined,
  selected: SelectedOptions
): { stock: number; sku: string; price?: number } | null {
  if (!variantStock || Object.keys(variantStock).length === 0) return null;
  const key = buildVariantKey(selected);
  return variantStock[key] || null;
}

function isLightColor(hex: string): boolean {
  const c = hex.replace('#', '');
  const r = parseInt(c.substring(0, 2), 16);
  const g = parseInt(c.substring(2, 4), 16);
  const b = parseInt(c.substring(4, 6), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 > 186;
}

export function ProductActions({ product, isAffiliate }: { product: Product; isAffiliate: boolean }) {
  const options: ProductOption[] = Array.isArray(product.options)
    ? product.options
    : Array.isArray(product.colours) && product.colours.length > 0
      ? [{ type: 'Colour', values: product.colours }]
      : [];

  const [selectedOptions, setSelectedOptions] = useState<SelectedOptions>({});

  function handleSelect(type: string, value: string) {
    const option = options.find((o) => o.type === type);
    if (!option) return;
    const matched = option.values.find((v) => v.name === value);
    if (matched) {
      setSelectedOptions((prev) => ({ ...prev, [type]: matched }));
    }
  }

  const inStockValues = useMemo(() => {
    if (!product.variant_stock || Object.keys(product.variant_stock).length === 0) {
      return null;
    }

    const result: Record<string, Set<string>> = {};
    for (const option of options) {
      result[option.type] = new Set();
      for (const val of option.values) {
        const testOpts = { ...selectedOptions, [option.type]: val };
        const vs = getVariantStock(product.variant_stock, testOpts);
        if (vs) {
          if (vs.stock > 0) {
            result[option.type].add(val.name);
          }
        } else {
          result[option.type].add(val.name);
        }
      }
    }
    return result;
  }, [product.variant_stock, options, selectedOptions]);

  const currentVariant = useMemo(() => {
    if (Object.keys(selectedOptions).length === 0) return null;
    return getVariantStock(product.variant_stock, selectedOptions);
  }, [product.variant_stock, selectedOptions]);

  if (options.length === 0) {
    return <AddToCartButton product={product} isAffiliate={isAffiliate} />;
  }

  const allSelected = options.every((o) => selectedOptions[o.type]);
  const isCurrentOOS = currentVariant !== null && currentVariant.stock <= 0;
  const missingOptions = options
    .filter((o) => !selectedOptions[o.type])
    .map((o) => o.type.toLowerCase());

  let missingLabel = '';
  if (missingOptions.length === 1) {
    missingLabel = `Please select a ${missingOptions[0]}`;
  } else if (missingOptions.length === 2) {
    missingLabel = `Please select a ${missingOptions[0]} and ${missingOptions[1]}`;
  } else if (missingOptions.length > 2) {
    const last = missingOptions.pop()!;
    missingLabel = `Please select a ${missingOptions.join(', ')}, and ${last}`;
  }

  return (
    <div className="space-y-6">
      {options.map((option) => {
        const selected = selectedOptions[option.type];
        const isColourType = option.type.toLowerCase() === 'colour';
        const sortedValues = sortOptionValues(option.values, option.type);
        const availableNames = inStockValues?.[option.type];

        if (isColourType) {
          return (
            <div key={option.type}>
              <div className="mb-3 flex items-baseline gap-2">
                <span className="text-sm font-semibold text-slate-900">{option.type}</span>
                {selected && (
                  <span className="text-sm text-slate-500">: {selected.name}</span>
                )}
              </div>
              <div className="flex flex-wrap gap-3">
                {sortedValues.map((val) => {
                  const isSelected = selected?.name === val.name;
                  const isOOS = availableNames && !availableNames.has(val.name);
                  const hex = val.hex || '#ccc';
                  return (
                    <button
                      key={val.name}
                      type="button"
                      title={isOOS ? `${val.name} — Out of stock` : val.name}
                      onClick={() => !isOOS && handleSelect(option.type, val.name)}
                      disabled={!!isOOS}
                      className="group flex flex-col items-center gap-1.5"
                    >
                      <span
                        className={`relative flex h-10 w-10 items-center justify-center rounded-full transition-all ${
                          isSelected
                            ? 'ring-2 ring-offset-2 ring-slate-900 scale-110'
                            : isOOS
                              ? 'opacity-30 cursor-not-allowed'
                              : 'hover:scale-105 cursor-pointer'
                        }`}
                        style={{
                          backgroundColor: hex,
                          boxShadow: isSelected
                            ? `0 0 0 2px white, 0 0 0 4px #1e293b`
                            : '0 0 0 1px rgba(0,0,0,0.1)',
                        }}
                      >
                        {isSelected && (
                          <Check
                            className="h-4 w-4"
                            style={{ color: isLightColor(hex) ? '#1e293b' : '#ffffff' }}
                          />
                        )}
                      </span>
                      <span
                        className={`text-xs leading-none transition-colors ${
                          isSelected
                            ? 'font-bold text-slate-900'
                            : isOOS
                              ? 'text-slate-400 line-through'
                              : 'text-slate-600 group-hover:text-slate-900'
                        }`}
                      >
                        {val.name}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        }

        return (
          <div key={option.type}>
            <div className="mb-3 flex items-baseline gap-2">
              <span className="text-sm font-semibold text-slate-900">{option.type}</span>
              {selected && (
                <span className="text-sm text-slate-500">: {selected.name}</span>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {sortedValues.map((val) => {
                const isSelected = selected?.name === val.name;
                const isOOS = availableNames && !availableNames.has(val.name);
                return (
                  <button
                    key={val.name}
                    type="button"
                    onClick={() => !isOOS && handleSelect(option.type, val.name)}
                    disabled={!!isOOS}
                    className={`min-h-[2.75rem] px-4 rounded-md text-sm font-medium transition-all ${
                      isSelected
                        ? 'border-2 border-slate-900 bg-slate-900 text-white shadow-sm'
                        : isOOS
                          ? 'border-2 border-slate-200 bg-slate-50 text-slate-300 line-through cursor-not-allowed'
                          : 'border-2 border-slate-300 bg-white text-slate-700 hover:border-slate-500 hover:bg-slate-50'
                    }`}
                  >
                    {val.name}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}

      {allSelected && isCurrentOOS && (
        <p className="text-sm text-red-600 font-medium">This combination is out of stock.</p>
      )}

      {!allSelected && missingLabel && (
        <p className="text-sm text-slate-500">{missingLabel}</p>
      )}

      {allSelected && !isCurrentOOS && (
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-600">
          {options.map((o) => {
            const val = selectedOptions[o.type];
            if (!val) return null;
            return (
              <span key={o.type}>
                <span className="font-medium text-slate-900">{o.type}:</span> {val.name}
              </span>
            );
          })}
        </div>
      )}

      <div className="flex flex-col gap-2">
        <AddToCartButton
          product={product}
          isAffiliate={isAffiliate}
          selectedOptions={allSelected ? selectedOptions : null}
          variantSku={currentVariant?.sku || null}
          disabled={!allSelected || isCurrentOOS}
        />
      </div>
    </div>
  );
}
