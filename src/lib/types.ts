export type Staff = {
  id: string;
  firstName: string;
  lastName: string;
  photo: string | null;
  sortOrder: number;
  active: boolean;
};

export type SnackRequest = {
  id: number;
  staffId: string;
  firstName: string;
  photo: string | null;
  category: string;
  item: string;
  details: string | null;
  createdAt: string; // ISO
};

export type ShoppingRequester = {
  requestId: number;
  staffId: string;
  firstName: string;
  photo: string | null;
  details: string | null;
};

export type ShoppingItem = {
  key: string;
  name: string;
  category: string;
  peopleCount: number;
  requestCount: number;
  purchased: boolean;
  requesters: ShoppingRequester[];
  firstRequestedAt: string;
};
