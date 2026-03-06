export type Role = "admin" | "staff";
export type TaskStatus = "pending" | "in_progress" | "paused" | "completed";
export type PhotoTrigger = "manual" | "admin" | "timer";
export type CommandType = "take_photo";
export type CommandStatus = "pending" | "acknowledged" | "completed";

export interface Profile {
  id: string;
  name: string;
  email: string | null;
  role: Role;
  created_at: string;
}

export interface Area {
  id: string;
  prefecture: string;
  city: string;
  ward: string;
  district: string;
  chome: string;
  total_households: number;
  lat: number | null;
  lng: number | null;
  created_at: string;
}

export interface Task {
  id: string;
  area_id: string;
  staff_id: string;
  status: TaskStatus;
  delivered_count: number;
  target_count: number;
  route_data: any;
  started_at: string | null;
  completed_at: string | null;
  paused_at: string | null;
  last_location: { lat: number; lng: number } | null;
  resume_from_index: number;
  total_distance_m: number;
  current_segment: number;
  total_segments: number;
  created_at: string;
  // joined
  area?: Area;
  staff?: Profile;
}

export interface GpsTrack {
  id: string;
  task_id: string;
  lat: number;
  lng: number;
  speed_m_per_min: number;
  recorded_at: string;
}

export interface DeliveryPhoto {
  id: string;
  task_id: string;
  staff_id: string;
  photo_url: string;
  triggered_by: PhotoTrigger;
  lat: number | null;
  lng: number | null;
  created_at: string;
}

export interface AdminCommand {
  id: string;
  task_id: string | null;
  staff_id: string;
  command: CommandType;
  status: CommandStatus;
  created_at: string;
}

export interface StaffSalesRecord {
  id: string;
  staff_id: string;
  area_id: string | null;
  month: string;
  order_count: number;
  avg_order_value: number;
  created_at: string;
}

export interface FlyerCalculation {
  id: string;
  task_id: string;
  base_count: number;
  buffer_count: number;
  recommended_count: number;
  historical_rate: number;
  reasoning: string;
  created_at: string;
}

export interface ParkingSpot {
  id: string;
  task_id: string;
  name: string;
  lat: number;
  lng: number;
  place_id: string | null;
  segment_index: number;
  ai_reason: string;
  selected: boolean;
  created_at: string;
}

export interface AiFeedback {
  id: string;
  staff_id: string;
  month: string;
  feedback: string;
  strengths: string[];
  improvements: string[];
  created_at: string;
}
