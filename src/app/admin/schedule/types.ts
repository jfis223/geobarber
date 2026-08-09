export interface ScheduleAppointment {
  id: string;
  status: string;
  startAt: string;
  endAt: string;
  requestedStartAt: string;
  address: string;
  totalPriceCents: number;
  customerName: string;
  customerPhone: string | null;
  services: { serviceName: string; quantity: number }[];
}

export const STATUS_COLORS: Record<string, string> = {
  REQUESTED: "#FF9500", // iOS systemOrange
  PROPOSED: "#007AFF", // iOS systemBlue
  CONFIRMED: "#34C759", // iOS systemGreen
  CANCELLED: "#8E8E93", // iOS systemGray
  COMPLETED: "#8E8E93",
  NO_SHOW: "#FF3B30", // iOS systemRed
  DECLINED: "#8E8E93",
  EXPIRED: "#8E8E93",
};
