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

export interface VintedItemSummary {
  id: number;
  title: string;
  price: string;
  currency: string;
  brand_title: string;
  size_title: string;
  url: string;
  photo: VintedPhoto | null;
  favourite_count: number;
  view_count: number;
  user: {
    id: number;
    login: string;
  };
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

export interface VintedItemDetail {
  item: {
    id: number;
    title: string;
    description: string;
    price: string;
    currency: string;
    brand_title: string;
    size_title: string;
    status: string;
    condition: string;
    url: string;
    photos: VintedPhoto[];
    favourite_count: number;
    view_count: number;
    created_at_ts: string;
    color1: string;
    color2: string;
    package_size_id: number;
    user: {
      id: number;
      login: string;
      feedback_reputation: number;
      feedback_count: number;
      city: string;
      country_title: string;
    };
  };
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
