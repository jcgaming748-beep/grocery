import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import EditLineItemModal from '@/components/EditLineItemModal';
import LineItemRow from '@/components/LineItemRow';
import ProductAutocompleteInput from '@/components/ProductAutocompleteInput';
import { usePlanningList } from '@/hooks/usePlanningList';

export default function ListPage() {
  const navigate = useNavigate();
  const {
    tripId,
    items,
    subtotal,
    statusMessage,
    clearStatusMessage,
    createList,
    addFromProduct,
    addFreeText,
    updateLineItemDetails,
    unlinkLineItemFromCatalog,
    removeLineItem,
    beginShopping,
  } = usePlanningList();

  const [editingItem, setEditingItem] = useState<(typeof items)[number] | null>(null);

  if (tripId == null) {
    return (
      <div className="page">
        <header className="page-header">
          <h1>Grocery list</h1>
        </header>
        <p className="empty">Build your list before heading to the store.</p>
        <button type="button" className="btn-primary btn-block" onClick={createList}>
          New grocery list
        </button>
      </div>
    );
  }

  return (
    <div className="page page-with-footer">
      <div className="page-body">
        <header className="page-header">
          <h1>Grocery list</h1>
        </header>

        {statusMessage ? (
          <button type="button" className="status-banner" onClick={clearStatusMessage}>
            {statusMessage}
          </button>
        ) : null}

        <ProductAutocompleteInput
          onSelectProduct={(product) => addFromProduct(product)}
          onAddFreeText={(name) => addFreeText(name)}
        />

        <section className="item-list">
          {items.length === 0 ? (
            <p className="empty">Add items to your list.</p>
          ) : (
            items.map((item) => (
              <LineItemRow
                key={item.id}
                item={item}
                onPress={() => setEditingItem(item)}
                onDelete={async () => {
                  if (!window.confirm(`Remove ${item.productName} from the list?`)) return;
                  await removeLineItem(item.id);
                }}
              />
            ))
          )}
        </section>
      </div>

      <footer className="sticky-footer">
        <div className="sticky-footer-summary">
          <span>Estimated total</span>
          <span className="sticky-footer-amount">${subtotal.toFixed(2)}</span>
        </div>
        <button
          type="button"
          className="btn-primary btn-block"
          disabled={items.length === 0}
          onClick={async () => {
            await beginShopping();
            navigate('/shop');
          }}>
          Start shopping
        </button>
      </footer>

      {editingItem ? (
        <EditLineItemModal
          item={editingItem}
          onSave={async (updates) => {
            await updateLineItemDetails(editingItem.id, updates, editingItem.productId);
            setEditingItem(null);
          }}
          onDelete={async () => {
            await removeLineItem(editingItem.id);
            setEditingItem(null);
          }}
          onUnlinkCatalog={async () => {
            await unlinkLineItemFromCatalog(editingItem.id);
            setEditingItem(null);
          }}
          onClose={() => setEditingItem(null)}
        />
      ) : null}
    </div>
  );
}
