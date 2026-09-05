'use client';

import { useState, useMemo } from 'react';
import { Check } from 'lucide-react';
import type { Product, ProductOption, SelectedOptions, VariantStock } from '@/lib/types';
import { AddToCartButton } from '@/components/add-to-cart-button';

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
  const selectedCount = options.filter((o) => selectedOptions[o.type]).length;
  const missingOptions = options
    .filter((o) => !selectedOptions[o.type])
    .map((o) => o.type.toLowerCase());

  const missingLabel =
    missingOptions.length === 2
      ? `Please select a ${missingOptions[0]} and ${missingOptions[1]}`
      : missingOptions.length === 1
        ? `Please select a ${missingOptions[0]}`
        : '';

  return (
    <div className="space-y-6">
      {options.map((option) => {
        const selected = selectedOptions[option.type];
        const isColourType = option.type.toLowerCase() === 'colour';
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
                {option.values.map((val) => {
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
              {option.values.map((val) => {
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

      {!allSelected && selectedCount > 0 && (
        <p className="text-sm text-slate-500">{missingLabel}</p>
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
