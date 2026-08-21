export type Role = 'CUSTOMER' | 'ADMIN';

export type User = {
  id: string;
  name: string;
  email: string;
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
  email: string;
  password: string;
  phone?: string;
};

export type LoginPayload = {
  email: string;
  password: string;
};
