export type BarcodeLookupResult = {
  barcode: string;
  name: string;
  category: string | null;
};

type OpenFoodFactsResponse = {
  status: number;
  product?: {
    product_name?: string;
    categories?: string;
  };
};

export async function lookupBarcodeOnline(barcode: string): Promise<BarcodeLookupResult | null> {
  const url = `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(barcode)}.json`;
  const response = await fetch(url);

  if (!response.ok) {
    return null;
  }

  const data = (await response.json()) as OpenFoodFactsResponse;

  if (data.status !== 1 || !data.product?.product_name) {
    return null;
  }

  const category = data.product.categories?.split(',')[0]?.trim() ?? null;

  return {
    barcode,
    name: data.product.product_name,
    category,
  };
}
