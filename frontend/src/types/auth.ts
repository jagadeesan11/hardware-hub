export type Role = 'CUSTOMER' | 'SHOP_OWNER' | 'ADMIN';

export type User = {
  id: string;
  name: string;
  // Exactly one of these is always non-null — a user signs in with either.
  email: string | null;
  phone: string | null;
  role: Role;
  createdAt: string;
};

export type AuthResponse = {
  user: User;
  token: string;
};

export type RegisterPayload = {
  name: string;
  /** Raw text as typed — an email address or a 10-digit mobile number. */
  identifier: string;
  password: string;
};

export type LoginPayload = {
  identifier: string;
  password: string;
};
