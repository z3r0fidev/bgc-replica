// Common types for BGC Replica

export interface PaginatedResponse<T> {
  items: T[];
  next_cursor?: string | null;
  has_more: boolean;
}
