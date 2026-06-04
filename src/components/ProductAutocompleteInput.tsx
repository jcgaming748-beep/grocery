import { useEffect, useState } from 'react';

import { listRecentProducts, searchProductsByName } from '@/db/repositories/products';
import { blobToObjectUrl } from '@/services/imageCompression';
import type { Product } from '@/db/schema';

type Props = {
  onSelectProduct: (product: Product) => void;
  onAddFreeText: (name: string) => void;
};

export default function ProductAutocompleteInput({ onSelectProduct, onAddFreeText }: Props) {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<Product[]>([]);
  const [thumbUrls, setThumbUrls] = useState<Map<number, string>>(new Map());

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const results = query.trim()
        ? await searchProductsByName(query)
        : await listRecentProducts();

      if (cancelled) return;

      setSuggestions(results);

      const urls = new Map<number, string>();
      for (const product of results) {
        if (product.id != null && product.imageBlob) {
          urls.set(product.id, blobToObjectUrl(product.imageBlob)!);
        }
      }
      setThumbUrls(urls);
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [query]);

  useEffect(() => {
    return () => {
      thumbUrls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [thumbUrls]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = query.trim();
    if (!trimmed) return;

    const exact = suggestions.find((p) => p.name.toLowerCase() === trimmed.toLowerCase());
    if (exact) {
      onSelectProduct(exact);
    } else {
      onAddFreeText(trimmed);
    }
    setQuery('');
    setSuggestions([]);
  }

  return (
    <div className="autocomplete">
      <form className="autocomplete-form" onSubmit={handleSubmit}>
        <input
          className="input"
          placeholder="Add item (search past products)"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <button type="submit" className="btn-secondary">
          Add
        </button>
      </form>

      {suggestions.length > 0 ? (
        <ul className="autocomplete-list">
          {suggestions.map((product) => (
            <li key={product.id}>
              <button
                type="button"
                className="autocomplete-option"
                onClick={() => {
                  onSelectProduct(product);
                  setQuery('');
                }}>
                {product.id != null && thumbUrls.has(product.id) ? (
                  <img src={thumbUrls.get(product.id)} alt="" className="line-item-thumb" />
                ) : (
                  <div className="line-item-thumb line-item-thumb-placeholder" />
                )}
                <span className="autocomplete-option-text">
                  <span className="autocomplete-option-name">{product.name}</span>
                  {product.defaultUnitPrice != null && product.defaultUnitPrice > 0 ? (
                    <span className="autocomplete-option-price">
                      ${product.defaultUnitPrice.toFixed(2)}
                    </span>
                  ) : null}
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
