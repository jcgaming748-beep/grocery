import { useCallback, useEffect, useMemo, useState } from 'react';

import {
  addLineItem,
  deleteLineItem,
  listLineItemsForTrip,
  updateLineItem,
} from '@/db/repositories/lineItems';
import { getProductByBarcode, upsertProduct, updateProductPrice } from '@/db/repositories/products';
import { getDefaultStore, getStore, getStoreByName } from '@/db/repositories/stores';
import { acceptReceiptTotal, getActiveTripByStatus, updateTripStoreName } from '@/db/repositories/trips';
import type { LineItem, PendingScan, ShoppingTrip } from '@/db/schema';
import { sumLineItems } from '@/db/schema';
import { lookupBarcodeOnline } from '@/services/barcodeLookup';
import {
  catalogNameMatchesLine,
  findLineItemForScanLink,
  lineCanAcceptProductLink,
} from '@/services/scanLineMatch';
import { fuzzyMatchProductName, parseTextCommand } from '@/services/textCommandParser';
import { useRefreshOnSync } from '@/hooks/useSyncStatus';

export function useShoppingTrip() {
  const [tripId, setTripId] = useState<string | null>(null);
  const [trip, setTrip] = useState<ShoppingTrip | null>(null);
  const [items, setItems] = useState<LineItem[]>([]);
  const [activeStoreId, setActiveStoreId] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const refreshItems = useCallback(async (id: string) => {
    setItems(await listLineItemsForTrip(id));
  }, []);

  const resolveActiveStore = useCallback(async (activeTrip: ShoppingTrip) => {
    if (activeTrip.storeName) {
      const store = await getStoreByName(activeTrip.storeName);
      if (store) {
        setActiveStoreId(store.id);
        return;
      }
    }

    const defaultStore = await getDefaultStore();
    if (defaultStore) {
      await updateTripStoreName(activeTrip.id, defaultStore.name);
      setTrip({ ...activeTrip, storeName: defaultStore.name });
      setActiveStoreId(defaultStore.id);
    }
  }, []);

  const loadShoppingTrip = useCallback(async () => {
    const activeTrip = await getActiveTripByStatus('shopping');
    if (activeTrip) {
      setTripId(activeTrip.id);
      setTrip(activeTrip);
      await resolveActiveStore(activeTrip);
      await refreshItems(activeTrip.id);
      return activeTrip;
    }
    setTripId(null);
    setTrip(null);
    setActiveStoreId(null);
    setItems([]);
    return null;
  }, [refreshItems, resolveActiveStore]);

  useEffect(() => {
    loadShoppingTrip();
  }, [loadShoppingTrip]);

  useRefreshOnSync(
    useCallback(async () => {
      await loadShoppingTrip();
    }, [loadShoppingTrip]),
  );

  const subtotal = useMemo(() => sumLineItems(items), [items]);

  const ensureTrip = useCallback(async (): Promise<string> => {
    if (tripId != null) return tripId;
    throw new Error('No active shopping trip. Start shopping from the List tab.');
  }, [tripId]);

  const stampPurchasedStore = useCallback(
    (storeId: string | null) => (storeId ? { purchasedStoreId: storeId } : {}),
    [],
  );

  const setActiveStore = useCallback(
    async (storeId: string) => {
      if (tripId == null) return;

      const store = await getStore(storeId);
      if (!store) return;

      await updateTripStoreName(tripId, store.name);
      setTrip((current) => (current ? { ...current, storeName: store.name } : current));
      setActiveStoreId(storeId);
    },
    [tripId],
  );

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

      const purchased = stampPurchasedStore(activeStoreId);

      if (
        matchedLine?.id &&
        lineCanAcceptProductLink(matchedLine, { id: product.id, barcode: input.barcode }) &&
        catalogNameMatchesLine(matchedLine.productName, product.name)
      ) {
        await updateLineItem(matchedLine.id, {
          quantity: matchedLine.quantity + input.quantity,
          unitPrice: input.unitPrice,
          productId: product.id,
          barcode: input.barcode,
          productName: product.name,
          ...purchased,
        });
      } else {
        await addLineItem({
          tripId: activeTripId,
          productName: product.name,
          barcode: input.barcode,
          quantity: input.quantity,
          unitPrice: input.unitPrice,
          productId: product.id ?? null,
          ...purchased,
        });
      }

      await refreshItems(activeTripId);
      setStatusMessage(`Added ${product.name}`);
    },
    [activeStoreId, ensureTrip, items, refreshItems, stampPurchasedStore],
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
        ...stampPurchasedStore(activeStoreId),
      });
      await refreshItems(activeTripId);
      setStatusMessage(`Saved and added ${product.name}`);
    },
    [activeStoreId, ensureTrip, refreshItems, stampPurchasedStore],
  );

  const updateLineItemDetails = useCallback(
    async (
      lineItemId: string,
      updates: { quantity: number; unitPrice: number; preferredStoreId?: string | null },
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

  const unlinkLineItemFromCatalog = useCallback(
    async (lineItemId: string) => {
      if (tripId == null) return;

      await updateLineItem(lineItemId, { productId: null, barcode: null });
      await refreshItems(tripId);
      setStatusMessage('Catalog link removed. Re-scan to attach the correct product.');
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
          ...stampPurchasedStore(activeStoreId),
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
    [activeStoreId, ensureTrip, items, refreshItems, stampPurchasedStore],
  );

  const addManualItem = useCallback(
    async (input: { name: string; quantity: number; unitPrice: number }) => {
      const activeTripId = await ensureTrip();
      await addLineItem({
        tripId: activeTripId,
        productName: input.name,
        quantity: input.quantity,
        unitPrice: input.unitPrice,
        ...stampPurchasedStore(activeStoreId),
      });
      await refreshItems(activeTripId);
      setStatusMessage(`Added ${input.name}`);
    },
    [activeStoreId, ensureTrip, refreshItems, stampPurchasedStore],
  );

  const finishWithReceiptTotal = useCallback(
    async (total: number) => {
      if (tripId == null) return;

      await acceptReceiptTotal(tripId, total);
      setTripId(null);
      setTrip(null);
      setActiveStoreId(null);
      setItems([]);
      setStatusMessage('Receipt total saved. Ready for review at home.');
    },
    [tripId],
  );

  return {
    tripId,
    trip,
    items,
    subtotal,
    activeStoreId,
    statusMessage,
    clearStatusMessage: () => setStatusMessage(null),
    loadShoppingTrip,
    setActiveStore,
    handleBarcodeScan,
    confirmScanAdd,
    saveManualProduct,
    updateLineItemDetails,
    unlinkLineItemFromCatalog,
    removeLineItem,
    handleTextCommand,
    addManualItem,
    finishWithReceiptTotal,
  };
}
