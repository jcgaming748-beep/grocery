import { useCallback, useEffect, useMemo, useState } from 'react';

import {
  addLineItem,
  deleteLineItem,
  listLineItemsForTrip,
  toggleLineItemConfirmed,
  updateLineItem,
} from '@/db/repositories/lineItems';
import { updateProductPrice } from '@/db/repositories/products';
import { completeTrip, getTrip } from '@/db/repositories/trips';
import type { LineItem, ShoppingTrip } from '@/db/schema';
import { sumConfirmedLineItems, sumLineItems } from '@/db/schema';

export function useTripReview(tripId: number) {
  const [trip, setTrip] = useState<(ShoppingTrip & { id: number }) | null>(null);
  const [items, setItems] = useState<(LineItem & { id: number })[]>([]);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const t = await getTrip(tripId);
    if (t) {
      setTrip(t);
      setItems(await listLineItemsForTrip(tripId));
    }
  }, [tripId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const confirmedTotal = useMemo(() => sumConfirmedLineItems(items), [items]);
  const lineTotal = useMemo(() => sumLineItems(items), [items]);
  const receiptTotal = trip?.receiptTotal ?? null;
  const difference =
    receiptTotal != null ? Math.round((receiptTotal - confirmedTotal) * 100) / 100 : null;

  const toggleConfirmed = useCallback(
    async (lineItemId: number) => {
      await toggleLineItemConfirmed(lineItemId);
      await refresh();
    },
    [refresh],
  );

  const updateLineItemDetails = useCallback(
    async (
      lineItemId: number,
      updates: { quantity: number; unitPrice: number },
      productId: number | null,
    ) => {
      await updateLineItem(lineItemId, updates);
      if (productId != null) {
        await updateProductPrice(productId, updates.unitPrice);
      }
      await refresh();
      setStatusMessage('Item updated.');
    },
    [refresh],
  );

  const removeLineItem = useCallback(
    async (lineItemId: number) => {
      await deleteLineItem(lineItemId);
      await refresh();
      setStatusMessage('Item removed.');
    },
    [refresh],
  );

  const addManualItem = useCallback(
    async (input: { name: string; quantity: number; unitPrice: number }) => {
      await addLineItem({
        tripId,
        productName: input.name,
        quantity: input.quantity,
        unitPrice: input.unitPrice,
        confirmed: false,
      });
      await refresh();
      setStatusMessage(`Added ${input.name}`);
    },
    [refresh, tripId],
  );

  const markComplete = useCallback(async () => {
    await completeTrip(tripId);
    setStatusMessage('Trip marked complete.');
    await refresh();
  }, [refresh, tripId]);

  return {
    trip,
    items,
    confirmedTotal,
    lineTotal,
    receiptTotal,
    difference,
    statusMessage,
    clearStatusMessage: () => setStatusMessage(null),
    toggleConfirmed,
    updateLineItemDetails,
    removeLineItem,
    addManualItem,
    markComplete,
    refresh,
  };
}
