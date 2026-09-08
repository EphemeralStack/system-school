// types/organization.ts
export interface Organization {
  $id: string;
  $createdAt: string;
  $updatedAt: string;
  name: string;
  email: string;
  phone: string;
  avatar: string;
  properties: number;
  userId: string;
  isActive: boolean;
  subscriptionTier: string;
  username: string;
}
