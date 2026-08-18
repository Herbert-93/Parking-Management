export type UserRole = "owner" | "manager";

export interface UserProfile {
  uid: string;
  email: string;
  name: string;
  role: UserRole;
  lotId: string;
  createdAt: FirebaseFirestore.Timestamp | FirebaseFirestore.FieldValue;
}

export interface RatePlan {
  id: string;
  lotId: string;
  label: string; // e.g. "5 hours", "12 hours", "24 hours"
  durationHours: number;
  price: number;
  active: boolean;
  createdAt: FirebaseFirestore.Timestamp | FirebaseFirestore.FieldValue;
}

export type SessionStatus = "active" | "completed";

export interface ParkingSession {
  id: string;
  lotId: string;
  plateNumber: string;
  photoBase64: string | null; // data URI, e.g. "data:image/jpeg;base64,...."
  rateId: string;
  rateLabel: string;
  ratePrice: number;
  durationHours: number;
  entryTime: FirebaseFirestore.Timestamp | FirebaseFirestore.FieldValue;
  expectedExitTime: FirebaseFirestore.Timestamp | FirebaseFirestore.FieldValue;
  exitTime: FirebaseFirestore.Timestamp | FirebaseFirestore.FieldValue | null;
  status: SessionStatus;
  finalCost: number | null;
  overageHours: number | null;
  overageCost: number | null;
  createdBy: string; // uid of manager who logged the car in
  closedBy: string | null;
  notes: string | null;
  createdAt: FirebaseFirestore.Timestamp | FirebaseFirestore.FieldValue;
  updatedAt: FirebaseFirestore.Timestamp | FirebaseFirestore.FieldValue;
}

export interface AuthedRequestUser {
  uid: string;
  email: string | undefined;
  role: UserRole;
  lotId: string;
}
