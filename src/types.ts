export type Role = 'buyer' | 'seller';

export type Product = {
  id: string;
  title: string;
  description: string;
  price: number;
  seller: string;
};

export type OrderStatus = 'pending-clarification' | 'confirmed' | 'refunded';

export type Order = Product & {
  buyerEmail: string;
  status: OrderStatus;
};

export type UserAccount = {
  email: string;
  studentId: string;
  role: Role;
};
