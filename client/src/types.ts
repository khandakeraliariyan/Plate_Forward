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
    city?: string;
    address?: string;
    logo?: string;
    isVerified?: boolean;
  };
  createdAt: string;
}

export interface Notification {
  _id: string;
  title: string;
  message: string;
  type: string;
  priority: string;
  isRead: boolean;
  createdAt: string;
}

export interface Session {
  _id: string;
  userAgent: string;
  ip: string;
  rememberMe: boolean;
  lastUsedAt: string;
  createdAt: string;
  expiresAt: string;
}

export interface RestaurantSummary {
  _id: string;
  restaurantName: string;
  city: string;
  address: string;
  latitude?: number;
  longitude?: number;
  logo?: string;
  isVerified: boolean;
}
