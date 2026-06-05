import type { LineItem } from '@/db/schema';

/** Link a barcode scan to an existing list line only when the match is unambiguous. */
export function findLineItemForScanLink(
  items: LineItem[],
  product: { id: string; name: string; barcode: string },
): LineItem | undefined {
  const byBarcode = items.find((item) => item.barcode === product.barcode);
  if (byBarcode) return byBarcode;

  const byProductId = items.find((item) => item.productId === product.id);
  if (byProductId) return byProductId;

  const normalizedName = product.name.trim().toLowerCase();
  const unlinkedExactMatches = items.filter(
    (item) =>
      !item.productId &&
      !item.barcode &&
      item.productName.trim().toLowerCase() === normalizedName,
  );

  return unlinkedExactMatches.length === 1 ? unlinkedExactMatches[0] : undefined;
}
