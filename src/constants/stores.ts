import type { TripStatus } from '@/db/schema';

export const FAREWAY_STORE_NAME = 'Fareway';

export const PURCHASED_TRIP_STATUSES: TripStatus[] = ['shopping', 'pending_review', 'complete'];

export const FAREWAY_BACKFILL_META_KEY = 'farewayBackfillDone';
