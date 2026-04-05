/**
 * Vinted API response types.
 * Typed from observed API responses - only includes fields we use.
 */

export interface VintedPhoto {
  id: number;
  url: string;
  dominant_color: string;
  is_main: boolean;
}

export interface VintedPrice {
  amount: string;
  currency_code: string;
}

export interface VintedItemSummary {
  id: number;
  title: string;
  price: string | VintedPrice;
  currency?: string;
  brand_title?: string;
  size_title?: string;
  /** Wardrobe endpoint uses `brand` instead of `brand_title`. */
  brand?: string;
  /** Wardrobe endpoint uses `size` instead of `size_title`. */
  size?: string;
  url: string;
  photo: VintedPhoto | null;
  favourite_count: number;
  view_count: number;
  user: {
    id: number;
    login: string;
  };
}

/** Extract displayable price string from either format. */
export function formatPrice(price: string | VintedPrice, currency?: string): string {
  if (typeof price === "string") {
    return currency ? `${price} ${currency}` : price;
  }
  return `${price.amount} ${price.currency_code}`;
}

export interface VintedSearchResponse {
  items: VintedItemSummary[];
  pagination: {
    current_page: number;
    total_pages: number;
    total_entries: number;
    per_page: number;
  };
}

export interface VintedBrand {
  id: number;
  title: string;
  slug: string;
  favourite_count: number;
  item_count: number;
  is_luxury: boolean;
}

export interface VintedBrandSearchResponse {
  brands: VintedBrand[];
}


export interface VintedUserProfile {
  user: {
    id: number;
    login: string;
    feedback_reputation: number;
    feedback_count: number;
    positive_feedback_count: number;
    negative_feedback_count: number;
    item_count: number;
    given_item_count: number;
    city: string;
    country_title: string;
    last_loged_on_ts: string;
    created_at: string;
    photo: VintedPhoto | null;
  };
}
