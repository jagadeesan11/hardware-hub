export type ShopSettings = {
  id: string;
  shopName: string;
  gstNumber: string | null;
  phone: string;
  email: string;
  addressLine1: string;
  city: string;
  state: string;
  pincode: string;
  district: string | null;
  landmark: string | null;
  updatedAt: string;
};

export type ShopSettingsInput = {
  shopName: string;
  gstNumber?: string;
  phone: string;
  email: string;
  addressLine1: string;
  city: string;
  state: string;
  pincode: string;
  district?: string;
  landmark?: string;
};
