import { useCallback, useMemo, useState } from 'react';

import { addLineItem, deleteLineItem, listLineItemsForTrip, updateLineItemQuantity } from '@/db/repositories/lineItems';
import { getProductByBarcode, upsertProduct } from '@/db/repositories/products';
import { createTrip } from '@/db/repositories/trips';
import type { LineItem } from '@/db/schema';
import { lookupBarcodeOnline } from '@/services/barcodeLookup';
import { fuzzyMatchProductName, parseTextCommand } from '@/services/textCommandParser';

export function useActiveTrip(initialTripId?: number) {
  const [tripId, setTripId] = useState<number | null>(initialTripId ?? null);
  const [items, setItems] = useState<(LineItem & { id: number })[]>([]);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const refreshItems = useCallback(async (id: number) => {
    setItems(await listLineItemsForTrip(id));
  }, []);

  const ensureTrip = useCallback(async (): Promise<number> => {
    if (tripId != null) return tripId;

    const trip = await createTrip();
    setTripId(trip.id);
    await refreshItems(trip.id);
    return trip.id;
  }, [refreshItems, tripId]);

  const subtotal = useMemo(
    () => items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0),
    [items],
  );

  const handleBarcodeScan = useCallback(
    async (barcode: string) => {
      const activeTripId = await ensureTrip();
      const localProduct = await getProductByBarcode(barcode);

      if (localProduct) {
        const item = await addLineItem({
          tripId: activeTripId,
          productName: localProduct.name,
          barcode,
          quantity: 1,
          unitPrice: localProduct.defaultUnitPrice ?? 0,
          productId: localProduct.id ?? null,
        });
        await refreshItems(activeTripId);
        setStatusMessage(`Added ${item.productName}`);
        return { needsManualEntry: false as const };
      }

      const online = await lookupBarcodeOnline(barcode);

      if (online) {
        const product = await upsertProduct({
          barcode,
          name: online.name,
          category: online.category,
        });
        const item = await addLineItem({
          tripId: activeTripId,
          productName: product.name,
          barcode,
          quantity: 1,
          unitPrice: product.defaultUnitPrice ?? 0,
          productId: product.id ?? null,
        });
        await refreshItems(activeTripId);
        setStatusMessage(`Added ${item.productName}`);
        return { needsManualEntry: false as const };
      }

      return { needsManualEntry: true as const, barcode };
    },
    [ensureTrip, refreshItems],
  );

  const saveManualProduct = useCallback(
    async (input: { barcode: string; name: string; unitPrice: number }) => {
      const activeTripId = await ensureTrip();
      const product = await upsertProduct({
        barcode: input.barcode,
        name: input.name,
        defaultUnitPrice: input.unitPrice,
      });
      await addLineItem({
        tripId: activeTripId,
        productName: product.name,
        barcode: input.barcode,
        quantity: 1,
        unitPrice: input.unitPrice,
        productId: product.id ?? null,
      });
      await refreshItems(activeTripId);
      setStatusMessage(`Saved and added ${product.name}`);
    },
    [ensureTrip, refreshItems],
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

      await updateLineItemQuantity(target.id, command.quantity);
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

  const startNewTrip = useCallback(async () => {
    const trip = await createTrip();
    setTripId(trip.id);
    setItems([]);
    setStatusMessage('Started new shopping trip.');
    return trip.id;
  }, []);

  const loadTrip = useCallback(
    async (id: number) => {
      setTripId(id);
      await refreshItems(id);
    },
    [refreshItems],
  );

  return {
    tripId,
    items,
    subtotal,
    statusMessage,
    clearStatusMessage: () => setStatusMessage(null),
    handleBarcodeScan,
    saveManualProduct,
    handleTextCommand,
    addManualItem,
    loadTrip,
    startNewTrip,
  };
}
