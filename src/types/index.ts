// ============================================
// GymTrack Pro - Type Definitions
// ============================================

export type UserRole = 'admin' | 'trainer' | 'client';

export type MembershipPlanType = 'monthly' | 'quarterly' | 'half_yearly' | 'yearly';

export type MembershipStatus = 'active' | 'expired' | 'frozen';

export type NotificationType =
  | 'absence_client'
  | 'absence_trainer'
  | 'membership_expiry'
  | 'membership_expired_scan'
  | 'check_in'
  | 'device_mismatch'
  | 'general';

export type Difficulty = 'beginner' | 'intermediate' | 'advanced';

// --- User & Profile ---
export interface Profile {
  id: string;
  role: UserRole;
  full_name: string;
  phone: string | null;
  email: string | null;
  photo_url: string | null;
  age: number | null;
  gender: string | null;
  device_id: string | null;
  created_at: string;
}

// --- Gym ---
export interface Gym {
  id: string;
  name: string;
  address: string | null;
  qr_secret: string;
  qr_last_rotated: string;
  latitude: number | null;
  longitude: number | null;
  radius_meters: number;
  created_at: string;
}

// --- Client ---
export interface Client {
  id: string;
  profile_id: string;
  gym_id: string | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  medical_conditions: string[];
  allergies: string[];
  assigned_trainer_id: string | null;
  created_at: string;
  // Joined fields
  profile?: Profile;
  membership?: Membership;
  trainer?: Profile;
}

// --- Membership ---
export interface Membership {
  id: string;
  client_id: string;
  plan_type: MembershipPlanType;
  start_date: string;
  expiry_date: string;
  status: MembershipStatus;
  created_at: string;
}

// --- Attendance ---
export interface Attendance {
  id: string;
  profile_id: string;
  role: UserRole;
  date: string;
  check_in: string;
  check_out: string | null;
  duration_minutes: number | null;
  // Joined
  profile?: Profile;
}

// --- Health Records ---
export interface HealthRecord {
  id: string;
  client_id: string;
  recorded_by: string | null;
  weight_kg: number | null;
  height_cm: number | null;
  bmi: number | null;
  body_fat_pct: number | null;
  bp_systolic: number | null;
  bp_diastolic: number | null;
  heart_rate: number | null;
  notes: string | null;
  recorded_at: string;
}

// --- Workout Templates ---
export interface WorkoutTemplate {
  id: string;
  name: string;
  description: string | null;
  difficulty: Difficulty;
  goal: string | null;
  created_by: string | null;
  created_at: string;
  exercises?: TemplateExercise[];
}

export interface TemplateExercise {
  id: string;
  template_id: string;
  day_of_week: number;
  exercise_name: string;
  muscle_group: string | null;
  sets: number | null;
  reps: number | null;
  weight_kg: number | null;
  rest_seconds: number | null;
  order_index: number | null;
  notes: string | null;
}

// --- Client Routines ---
export interface ClientRoutine {
  id: string;
  client_id: string;
  assigned_by: string | null;
  name: string;
  is_active: boolean;
  start_date: string | null;
  end_date: string | null;
  created_at: string;
  exercises?: ClientRoutineExercise[];
}

export interface ClientRoutineExercise {
  id: string;
  routine_id: string;
  day_of_week: number;
  exercise_name: string;
  muscle_group: string | null;
  sets: number | null;
  reps: number | null;
  weight_kg: number | null;
  rest_seconds: number | null;
  order_index: number | null;
  notes: string | null;
}

// --- Exercise Library ---
export interface Exercise {
  id: string;
  name: string;
  muscle_group: string | null;
  description: string | null;
  image_url: string | null;
  created_by: string | null;
}

// --- Notifications ---
export interface AppNotification {
  id: string;
  recipient_id: string;
  type: NotificationType;
  title: string;
  message: string | null;
  is_read: boolean;
  metadata: Record<string, any> | null;
  created_at: string;
}

// --- Navigation Types ---
export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
};

export type AdminTabParamList = {
  Dashboard: undefined;
  Clients: undefined;
  GymQR: undefined;
  Trainers: undefined;
  Notifications: undefined;
};

export type TrainerTabParamList = {
  Dashboard: undefined;
  ScanQR: undefined;
  MyClients: undefined;
  MyAttendance: undefined;
  Notifications: undefined;
};

export type ClientTabParamList = {
  Dashboard: undefined;
  ScanQR: undefined;
  Attendance: undefined;
  MyRoutine: undefined;
  Profile: undefined;
};

// --- Scan Result ---
export type ScanStatus = 'success' | 'expired' | 'expiring_soon' | 'device_mismatch' | 'error';

export interface ScanResult {
  status: ScanStatus;
  message: string;
  attendance?: Attendance;
  daysUntilExpiry?: number;
}

// --- Dashboard Stats ---
export interface DashboardStats {
  totalClients: number;
  totalTrainers: number;
  todayCheckIns: number;
  todayAbsent: number;
  attendancePercentage: number;
  expiringMemberships: number;
}
