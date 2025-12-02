import { AttendanceConfiguration } from "../types";

export const mockAttendanceConfigurations = [
  {
    id: 1,
    name: "Default Office Configuration",
    working_days_per_week: 6,
    working_hours_per_day: 8,
    grace_period_late_minutes: 15,
    grace_period_early_going_minutes: 15,
    half_day_hours_threshold: 4,
    full_day_hours_threshold: 7,
    overtime_start_after_hours: 8,
    week_off_pattern: "fixed",
    fixed_week_off_days: [0], // Sunday
    auto_approve_absent: false,
    require_location_check: true,
    require_selfie: false,
    allow_qr_code: true,
    ip_restriction_enabled: true,
    allowed_ip_ranges: ["192.168.1.0/24", "10.0.0.0/8"],
    geofencing_enabled: true,
    office_latitude: 24.7136,
    office_longitude: 46.6753,
    geofence_radius_meters: 100,
    is_active: true,
    effective_from: "2024-01-01",
    created_by: 1,
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
  },
  {
    id: 2,
    name: "Remote Work Configuration",
    working_days_per_week: 5,
    working_hours_per_day: 8,
    grace_period_late_minutes: 30,
    grace_period_early_going_minutes: 30,
    half_day_hours_threshold: 4,
    full_day_hours_threshold: 6,
    overtime_start_after_hours: 8,
    week_off_pattern: "fixed",
    fixed_week_off_days: [5, 6], // Friday and Saturday
    auto_approve_absent: false,
    require_location_check: false,
    require_selfie: false,
    allow_qr_code: false,
    ip_restriction_enabled: false,
    geofencing_enabled: false,
    is_active: true,
    effective_from: "2024-01-01",
    created_by: 1,
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
  },
  {
    id: 3,
    name: "Flexible Hours Configuration",
    working_days_per_week: 5,
    working_hours_per_day: 8,
    grace_period_late_minutes: 60,
    grace_period_early_going_minutes: 60,
    half_day_hours_threshold: 3,
    full_day_hours_threshold: 6,
    overtime_start_after_hours: 9,
    week_off_pattern: "fixed",
    fixed_week_off_days: [5, 6], // Friday and Saturday
    auto_approve_absent: false,
    require_location_check: true,
    require_selfie: true,
    allow_qr_code: true,
    ip_restriction_enabled: false,
    geofencing_enabled: true,
    office_latitude: 24.7136,
    office_longitude: 46.6753,
    geofence_radius_meters: 200,
    is_active: true,
    effective_from: "2024-01-01",
    created_by: 1,
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
  },
];

export const defaultAttendanceConfiguration = mockAttendanceConfigurations[0];

// Helper functions
export const getActiveConfiguration = () => {
  const today = new Date().toISOString().split("T")[0];
  return (
    mockAttendanceConfigurations.find(
      (config) =>
        config.is_active &&
        new Date(config.effective_from) <= new Date(today) &&
        (!config.effective_to ||
          new Date(config.effective_to) >= new Date(today))
    ) || defaultAttendanceConfiguration
  );
};

export const getConfigurationOptions = () =>
  mockAttendanceConfigurations
    .filter((config) => config.is_active)
    .map((config) => ({
      value: config.id.toString(),
      label: config.name,
    }));

export const validateAttendanceByConfiguration = (
  configuration: AttendanceConfiguration,
  checkInTime?: string,
  checkOutTime?: string,
  location?: string,
  ipAddress?: string
) => {
  const issues: string[] = [];

  // Check grace period for late coming
  if (checkInTime) {
    const [hours, minutes] = checkInTime.split(":").map(Number);
    const checkInTotalMinutes = hours * 60 + minutes;
    const shiftStartMinutes = 9 * 60; // Assuming 9 AM start

    if (
      checkInTotalMinutes >
      shiftStartMinutes + configuration.grace_period_late_minutes
    ) {
      issues.push(
        `Late arrival by ${checkInTotalMinutes - shiftStartMinutes} minutes`
      );
    }
  }

  // Check early going
  if (checkOutTime) {
    const [hours, minutes] = checkOutTime.split(":").map(Number);
    const checkOutTotalMinutes = hours * 60 + minutes;
    const shiftEndMinutes = 18 * 60; // Assuming 6 PM end

    if (
      checkOutTotalMinutes <
      shiftEndMinutes - configuration.grace_period_early_going_minutes
    ) {
      issues.push(
        `Early departure by ${shiftEndMinutes - checkOutTotalMinutes} minutes`
      );
    }
  }

  // Check location requirement
  if (configuration.require_location_check && !location) {
    issues.push("Location verification required");
  }

  // Check IP restriction
  if (configuration.ip_restriction_enabled && ipAddress) {
    const isAllowed = configuration.allowed_ip_ranges?.some((range) => {
      // Simple IP range check (can be enhanced)
      return ipAddress.startsWith(range.split("/")[0]);
    });

    if (!isAllowed) {
      issues.push("IP address not in allowed range");
    }
  }

  // Check geofencing
  if (configuration.geofencing_enabled) {
    // Basic geofencing validation (can be enhanced with actual GPS coordinates)
    if (!location || !location.includes("Office")) {
      issues.push("Location outside office geofence");
    }
  }

  return issues;
};
