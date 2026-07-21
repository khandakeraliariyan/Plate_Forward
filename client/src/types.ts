export type Role = "restaurant" | "ngo" | "volunteer" | "admin";

export interface User {
  _id: string;
  fullName: string;
  email: string;
  role: Role;
  avatar?: string;
  isVerified?: boolean;
}

export interface Donation {
  _id: string;
  title: string;
  description?: string;
  foodType: string;
  quantity: number;
  unit: string;
  expiryTime: string;
  pickupStartTime: string;
  pickupEndTime: string;
  pickupAddress: string;
  city: string;
  images?: { url: string }[];
  status: string;
  restaurant: {
    _id: string;
    restaurantName: string;
  };
  createdAt: string;
}
