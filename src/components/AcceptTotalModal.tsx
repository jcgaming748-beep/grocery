type Props = {
  estimatedTotal: number;
  onConfirm: (total: number) => void;
  onClose: () => void;
};

export default function AcceptTotalModal({ estimatedTotal, onConfirm, onClose }: Props) {
  return (
    <div className="modal-overlay modal-overlay-dim" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <h2>Receipt total</h2>
        <p className="hint">Estimated from list: ${estimatedTotal.toFixed(2)}</p>

        <label className="field-label" htmlFor="receipt-total">
          Total on receipt
        </label>
        <input
          id="receipt-total"
          className="input"
          inputMode="decimal"
          placeholder="0.00"
          autoFocus
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              const value = parseFloat((e.target as HTMLInputElement).value);
              if (Number.isFinite(value) && value >= 0) {
                onConfirm(value);
              }
            }
          }}
        />

        <button
          type="button"
          className="btn-primary btn-block"
          onClick={() => {
            const input = document.getElementById('receipt-total') as HTMLInputElement;
            const value = parseFloat(input.value);
            if (!Number.isFinite(value) || value < 0) return;
            onConfirm(value);
          }}>
          Save & finish trip
        </button>
        <button type="button" className="btn-link" onClick={onClose}>
          Cancel
        </button>
      </div>
    </div>
  );
}
