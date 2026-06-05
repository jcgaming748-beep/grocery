import { useCallback, useEffect, useMemo, useState } from 'react';

import {
  addLineItem,
  deleteLineItem,
  listLineItemsForTrip,
  updateLineItem,
} from '@/db/repositories/lineItems';
import { getProductByBarcode, upsertProduct, updateProductPrice } from '@/db/repositories/products';
import { acceptReceiptTotal, getActiveTripByStatus } from '@/db/repositories/trips';
import type { LineItem, PendingScan } from '@/db/schema';
import { sumLineItems } from '@/db/schema';
import { lookupBarcodeOnline } from '@/services/barcodeLookup';
import { findLineItemForScanLink } from '@/services/scanLineMatch';
import { fuzzyMatchProductName, parseTextCommand } from '@/services/textCommandParser';
import { useRefreshOnSync } from '@/hooks/useSyncStatus';

export function useShoppingTrip() {
  const [tripId, setTripId] = useState<string | null>(null);
  const [items, setItems] = useState<LineItem[]>([]);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const refreshItems = useCallback(async (id: string) => {
    setItems(await listLineItemsForTrip(id));
  }, []);

  const loadShoppingTrip = useCallback(async () => {
    const trip = await getActiveTripByStatus('shopping');
    if (trip) {
      setTripId(trip.id);
      await refreshItems(trip.id);
      return trip;
    }
    setTripId(null);
    setItems([]);
    return null;
  }, [refreshItems]);

  useEffect(() => {
    loadShoppingTrip();
  }, [loadShoppingTrip]);

  useRefreshOnSync(useCallback(async () => {
    await loadShoppingTrip();
  }, [loadShoppingTrip]));

  const subtotal = useMemo(() => sumLineItems(items), [items]);

  const ensureTrip = useCallback(async (): Promise<string> => {
    if (tripId != null) return tripId;
    throw new Error('No active shopping trip. Start shopping from the List tab.');
  }, [tripId]);

  const handleBarcodeScan = useCallback(
    async (barcode: string): Promise<PendingScan | { needsManualEntry: true; barcode: string }> => {
      await ensureTrip();

      const localProduct = await getProductByBarcode(barcode);

      if (localProduct) {
        return {
          barcode,
          productName: localProduct.name,
          productId: localProduct.id ?? null,
          category: localProduct.category,
          defaultUnitPrice: localProduct.defaultUnitPrice,
          imageBlob: localProduct.imageBlob ?? null,
        };
      }

      const online = await lookupBarcodeOnline(barcode);

      if (online) {
        return {
          barcode,
          productName: online.name,
          productId: null,
          category: online.category,
          defaultUnitPrice: null,
          imageBlob: null,
        };
      }

      return { needsManualEntry: true, barcode };
    },
    [ensureTrip],
  );

  const confirmScanAdd = useCallback(
    async (input: {
      barcode: string;
      productName: string;
      category: string | null;
      quantity: number;
      unitPrice: number;
      imageBlob: Blob | null;
      imageChanged: boolean;
    }) => {
      const activeTripId = await ensureTrip();

      const product = await upsertProduct({
        barcode: input.barcode,
        name: input.productName,
        category: input.category,
        defaultUnitPrice: input.unitPrice,
        imageBlob: input.imageChanged ? input.imageBlob : undefined,
      });

      const matchedLine = findLineItemForScanLink(items, {
        id: product.id,
        name: product.name,
        barcode: input.barcode,
      });

      if (matchedLine?.id) {
        await updateLineItem(matchedLine.id, {
          quantity: matchedLine.quantity + input.quantity,
          unitPrice: input.unitPrice,
          productId: product.id,
          barcode: input.barcode,
          productName: product.name,
        });
      } else {
        await addLineItem({
          tripId: activeTripId,
          productName: product.name,
          barcode: input.barcode,
          quantity: input.quantity,
          unitPrice: input.unitPrice,
          productId: product.id ?? null,
        });
      }

      await refreshItems(activeTripId);
      setStatusMessage(`Added ${product.name}`);
    },
    [ensureTrip, items, refreshItems],
  );

  const saveManualProduct = useCallback(
    async (input: {
      barcode: string;
      name: string;
      unitPrice: number;
      quantity?: number;
      imageBlob?: Blob | null;
    }) => {
      const activeTripId = await ensureTrip();
      const product = await upsertProduct({
        barcode: input.barcode,
        name: input.name,
        defaultUnitPrice: input.unitPrice,
        imageBlob: input.imageBlob ?? null,
      });
      await addLineItem({
        tripId: activeTripId,
        productName: product.name,
        barcode: input.barcode,
        quantity: input.quantity ?? 1,
        unitPrice: input.unitPrice,
        productId: product.id ?? null,
      });
      await refreshItems(activeTripId);
      setStatusMessage(`Saved and added ${product.name}`);
    },
    [ensureTrip, refreshItems],
  );

  const updateLineItemDetails = useCallback(
    async (
      lineItemId: string,
      updates: { quantity: number; unitPrice: number },
      productId: string | null,
    ) => {
      if (tripId == null) return;

      await updateLineItem(lineItemId, updates);
      if (productId != null) {
        await updateProductPrice(productId, updates.unitPrice);
      }
      await refreshItems(tripId);
      setStatusMessage('Item updated.');
    },
    [refreshItems, tripId],
  );

  const removeLineItem = useCallback(
    async (lineItemId: string) => {
      if (tripId == null) return;

      await deleteLineItem(lineItemId);
      await refreshItems(tripId);
      setStatusMessage('Item removed.');
    },
    [refreshItems, tripId],
  );

  const handleTextCommand = useCallback(
    async (text: string) => {
      const command = parseTextCommand(text);
      if (!command) {
        setStatusMessage('Could not understand command. Try: add 2 milk at 3.49');
        return;
      }

      const activeTripId = await ensureTrip();
      const productNames = items.map((item) => item.productName);

      if (command.type === 'add') {
        await addLineItem({
          tripId: activeTripId,
          productName: command.productName,
          quantity: command.quantity,
          unitPrice: command.unitPrice ?? 0,
        });
        await refreshItems(activeTripId);
        setStatusMessage(`Added ${command.quantity} ${command.productName}`);
        return;
      }

      const matchedName = fuzzyMatchProductName(command.productName, productNames);
      if (!matchedName) {
        setStatusMessage(`No item matching "${command.productName}" on this trip.`);
        return;
      }

      const target = items.find((item) => item.productName === matchedName);
      if (!target?.id) return;

      if (command.type === 'remove') {
        await deleteLineItem(target.id);
        await refreshItems(activeTripId);
        setStatusMessage(`Removed ${matchedName}`);
        return;
      }

      await updateLineItem(target.id, { quantity: command.quantity });
      await refreshItems(activeTripId);
      setStatusMessage(`Updated ${matchedName} to ${command.quantity}`);
    },
    [ensureTrip, items, refreshItems],
  );

  const addManualItem = useCallback(
    async (input: { name: string; quantity: number; unitPrice: number }) => {
      const activeTripId = await ensureTrip();
      await addLineItem({
        tripId: activeTripId,
        productName: input.name,
        quantity: input.quantity,
        unitPrice: input.unitPrice,
      });
      await refreshItems(activeTripId);
      setStatusMessage(`Added ${input.name}`);
    },
    [ensureTrip, refreshItems],
  );

  const finishWithReceiptTotal = useCallback(
    async (total: number) => {
      if (tripId == null) return;

      await acceptReceiptTotal(tripId, total);
      setTripId(null);
      setItems([]);
      setStatusMessage('Receipt total saved. Ready for review at home.');
    },
    [tripId],
  );

  return {
    tripId,
    items,
    subtotal,
    statusMessage,
    clearStatusMessage: () => setStatusMessage(null),
    loadShoppingTrip,
    handleBarcodeScan,
    confirmScanAdd,
    saveManualProduct,
    updateLineItemDetails,
    removeLineItem,
    handleTextCommand,
    addManualItem,
    finishWithReceiptTotal,
  };
}
