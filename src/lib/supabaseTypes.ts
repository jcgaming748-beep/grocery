export type RemoteProduct = {
  id: string;
  user_id: string;
  barcode: string;
  name: string;
  default_unit_price: number | null;
  category: string | null;
  last_used_at: string | null;
  image_path: string | null;
  updated_at: string;
};

export type RemoteShoppingTrip = {
  id: string;
  user_id: string;
  date: string;
  store_name: string | null;
  notes: string | null;
  status: string;
  receipt_total: number | null;
  updated_at: string;
};

export type RemoteLineItem = {
  id: string;
  user_id: string;
  trip_id: string;
  product_name: string;
  barcode: string | null;
  quantity: number;
  unit_price: number;
  product_id: string | null;
  confirmed: boolean;
  updated_at: string;
};
