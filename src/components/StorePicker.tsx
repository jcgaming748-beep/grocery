import type { Store } from '@/db/schema';

type Props = {
  stores: Store[];
  value: string | null;
  onChange: (storeId: string | null) => void;
  label?: string;
  allowNone?: boolean;
  noneLabel?: string;
};

export default function StorePicker({
  stores,
  value,
  onChange,
  label = 'Store',
  allowNone = true,
  noneLabel = 'Any store',
}: Props) {
  return (
    <div className="store-picker">
      <label className="field-label" htmlFor="store-picker-select">
        {label}
      </label>
      <select
        id="store-picker-select"
        className="input"
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value || null)}>
        {allowNone ? <option value="">{noneLabel}</option> : null}
        {stores.map((store) => (
          <option key={store.id} value={store.id}>
            {store.name}
          </option>
        ))}
      </select>
    </div>
  );
}
