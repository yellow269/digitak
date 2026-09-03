'use client';

import { useState } from 'react';
import { Check } from 'lucide-react';
import type { Product, ColourOption } from '@/lib/types';
import { AddToCartButton } from '@/components/add-to-cart-button';

export function ProductActions({ product, isAffiliate }: { product: Product; isAffiliate: boolean }) {
  const colours: ColourOption[] = Array.isArray(product.colours) ? product.colours : [];
  const [selectedColour, setSelectedColour] = useState<ColourOption | null>(
    colours.length === 1 ? colours[0] : null
  );

  if (colours.length === 0) {
    return <AddToCartButton product={product} isAffiliate={isAffiliate} />;
  }

  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm font-medium text-slate-700 mb-2">
          Colour{selectedColour ? `: ${selectedColour.name}` : ''}
        </p>
        <div className="flex flex-wrap gap-2">
          {colours.map((colour) => {
            const isSelected = selectedColour?.name === colour.name;
            return (
              <button
                key={colour.name}
                type="button"
                title={colour.name}
                onClick={() => setSelectedColour(colour)}
                className={`relative h-9 w-9 rounded-full border-2 transition-all ${
                  isSelected
                    ? 'border-slate-900 ring-2 ring-slate-900 ring-offset-2 scale-110'
                    : 'border-slate-300 hover:border-slate-500'
                }`}
                style={{ backgroundColor: colour.hex }}
              >
                {isSelected && (
                  <span className="absolute inset-0 flex items-center justify-center">
                    <Check
                      className="h-4 w-4"
                      style={{ color: isLightColor(colour.hex) ? '#000' : '#fff' }}
                    />
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
      <AddToCartButton product={product} isAffiliate={isAffiliate} selectedColour={selectedColour} />
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
