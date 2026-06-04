import { useCallback, useEffect, useMemo, useState } from 'react';

import {
  addLineItem,
  deleteLineItem,
  listLineItemsForTrip,
  updateLineItem,
} from '@/db/repositories/lineItems';
import { updateProductPrice } from '@/db/repositories/products';
import {
  createPlanningTrip,
  getActiveTripByStatus,
  startShopping,
} from '@/db/repositories/trips';
import type { LineItem, Product } from '@/db/schema';
import { sumLineItems } from '@/db/schema';

export function usePlanningList() {
  const [tripId, setTripId] = useState<number | null>(null);
  const [items, setItems] = useState<(LineItem & { id: number })[]>([]);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const refresh = useCallback(async (id: number) => {
    setItems(await listLineItemsForTrip(id));
  }, []);

  const loadPlanningTrip = useCallback(async () => {
    const trip = await getActiveTripByStatus('planning');
    if (trip) {
      setTripId(trip.id);
      await refresh(trip.id);
      return trip.id;
    }
    setTripId(null);
    setItems([]);
    return null;
  }, [refresh]);

  useEffect(() => {
    loadPlanningTrip();
  }, [loadPlanningTrip]);

  const subtotal = useMemo(() => sumLineItems(items), [items]);

  const createList = useCallback(async () => {
    const trip = await createPlanningTrip();
    setTripId(trip.id);
    setItems([]);
    setStatusMessage('New grocery list created.');
    return trip.id;
  }, []);

  const addFromProduct = useCallback(
    async (product: Product, quantity = 1) => {
      if (tripId == null) return;

      await addLineItem({
        tripId,
        productName: product.name,
        barcode: product.barcode,
        quantity,
        unitPrice: product.defaultUnitPrice ?? 0,
        productId: product.id ?? null,
      });
      await refresh(tripId);
      setStatusMessage(`Added ${product.name}`);
    },
    [refresh, tripId],
  );

  const addFreeText = useCallback(
    async (name: string, quantity = 1, unitPrice = 0) => {
      if (tripId == null) return;

      await addLineItem({
        tripId,
        productName: name.trim(),
        quantity,
        unitPrice,
      });
      await refresh(tripId);
      setStatusMessage(`Added ${name.trim()}`);
    },
    [refresh, tripId],
  );

  const updateLineItemDetails = useCallback(
    async (
      lineItemId: number,
      updates: { quantity: number; unitPrice: number },
      productId: number | null,
    ) => {
      if (tripId == null) return;

      await updateLineItem(lineItemId, updates);
      if (productId != null) {
        await updateProductPrice(productId, updates.unitPrice);
      }
      await refresh(tripId);
      setStatusMessage('Item updated.');
    },
    [refresh, tripId],
  );

  const removeLineItem = useCallback(
    async (lineItemId: number) => {
      if (tripId == null) return;

      await deleteLineItem(lineItemId);
      await refresh(tripId);
      setStatusMessage('Item removed.');
    },
    [refresh, tripId],
  );

  const beginShopping = useCallback(async () => {
    if (tripId == null) return null;

    await startShopping(tripId);
    setStatusMessage('Shopping started.');
    return tripId;
  }, [tripId]);

  return {
    tripId,
    items,
    subtotal,
    statusMessage,
    clearStatusMessage: () => setStatusMessage(null),
    loadPlanningTrip,
    createList,
    addFromProduct,
    addFreeText,
    updateLineItemDetails,
    removeLineItem,
    beginShopping,
  };
}
