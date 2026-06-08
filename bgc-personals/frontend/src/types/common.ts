export interface PaginatedResponse<T> {
  items: T[];
  metadata: {
    has_next: boolean;
    next_cursor?: string | null;
    count: number;
  };
}
