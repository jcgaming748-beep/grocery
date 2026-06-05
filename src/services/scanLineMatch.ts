import type { LineItem } from '@/db/schema';

export function catalogNameMatchesLine(lineName: string, catalogName: string): boolean {
  return lineName.trim().toLowerCase() === catalogName.trim().toLowerCase();
}

/** A list line can only be linked to a scan if it isn't already tied to a different product. */
export function lineCanAcceptProductLink(
  item: LineItem,
  product: { id: string; barcode: string },
): boolean {
  if (item.barcode && item.barcode !== product.barcode) {
    return false;
  }
  if (item.productId && item.productId !== product.id) {
    return false;
  }
  return true;
}

/**
 * Link a scan to an existing list line only when safe:
 * - same barcode on the line, or
 * - unlinked free-text line with the exact same name
 */
export function findLineItemForScanLink(
  items: LineItem[],
  product: { id: string; name: string; barcode: string },
): LineItem | undefined {
  const byBarcode = items.find(
    (item) =>
      item.barcode === product.barcode &&
      lineCanAcceptProductLink(item, product) &&
      catalogNameMatchesLine(item.productName, product.name),
  );
  if (byBarcode) return byBarcode;

  const normalizedName = product.name.trim().toLowerCase();
  const unlinkedExactMatches = items.filter(
    (item) =>
      lineCanAcceptProductLink(item, product) &&
      !item.productId &&
      !item.barcode &&
      item.productName.trim().toLowerCase() === normalizedName,
  );

  return unlinkedExactMatches.length === 1 ? unlinkedExactMatches[0] : undefined;
}
