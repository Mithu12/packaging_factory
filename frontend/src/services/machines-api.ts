import { makeRequest } from "@/services/api-utils";

export type MachineStatus = "active" | "inactive" | "under_maintenance";
export type MaintenanceType = "preventive" | "corrective";

export interface Machine {
  id: string;
  factory_id?: number | null;
  production_line_id?: number | null;
  name: string;
  code: string;
  model?: string;
  serial_number?: string;
  manufacturer?: string;
  purchase_date?: string;
  location?: string;
  status: MachineStatus;
  next_service_date?: string;
  notes?: string;
  is_active: boolean;
  created_at: string;
  updated_at?: string;
  production_line_name?: string;
  factory_name?: string;
}

export interface MachineMaintenanceLog {
  id: string;
  machine_id: string;
  maintenance_type: MaintenanceType;
  start_at: string;
  end_at?: string;
  technician?: string;
  cost: number;
  next_service_date?: string;
  notes?: string;
  created_at: string;
  updated_at?: string;
}

export interface CreateMachineRequest {
  name: string;
  code: string;
  model?: string;
  serial_number?: string;
  manufacturer?: string;
  purchase_date?: string;
  location?: string;
  production_line_id?: number | null;
  status?: MachineStatus;
  next_service_date?: string;
  notes?: string;
}

export interface UpdateMachineRequest extends Partial<CreateMachineRequest> {
  is_active?: boolean;
}

export interface CreateMachineMaintenanceLogRequest {
  maintenance_type: MaintenanceType;
  start_at?: string;
  end_at?: string;
  technician?: string;
  cost?: number;
  next_service_date?: string;
  notes?: string;
}

export interface MachineStats {
  total_machines: number;
  active_machines: number;
  inactive_machines: number;
  under_maintenance: number;
  overdue_service: number;
}

export interface MachineQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: MachineStatus;
  is_active?: boolean;
  factory_id?: number;
  production_line_id?: number;
  sort_by?: "name" | "code" | "status" | "next_service_date" | "created_at";
  sort_order?: "asc" | "desc";
}

export class MachinesApiService {
  private static readonly BASE_URL = "/factory/machines";

  static async getMachines(params?: MachineQueryParams): Promise<{
    machines: Machine[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const queryString = params
      ? "?" +
        new URLSearchParams(
          Object.entries(params).reduce((acc, [key, value]) => {
            if (value !== undefined && value !== null && value !== "") {
              acc[key] = String(value);
            }
            return acc;
          }, {} as Record<string, string>)
        ).toString()
      : "";
    return makeRequest(`${this.BASE_URL}${queryString}`);
  }

  static async getMachineById(id: string): Promise<Machine> {
    return makeRequest<Machine>(`${this.BASE_URL}/${id}`);
  }

  static async createMachine(data: CreateMachineRequest): Promise<Machine> {
    return makeRequest<Machine>(this.BASE_URL, {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  static async updateMachine(id: string, data: UpdateMachineRequest): Promise<Machine> {
    return makeRequest<Machine>(`${this.BASE_URL}/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  }

  static async deleteMachine(id: string): Promise<{ deleted: boolean }> {
    return makeRequest<{ deleted: boolean }>(`${this.BASE_URL}/${id}`, {
      method: "DELETE",
    });
  }

  static async getMachineStats(factory_id?: number): Promise<MachineStats> {
    const queryString = factory_id ? `?factory_id=${factory_id}` : "";
    return makeRequest<MachineStats>(`${this.BASE_URL}/stats${queryString}`);
  }

  static async getMaintenanceLogs(machineId: string): Promise<{
    logs: MachineMaintenanceLog[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    return makeRequest(`${this.BASE_URL}/${machineId}/maintenance-logs`);
  }

  static async createMaintenanceLog(
    machineId: string,
    data: CreateMachineMaintenanceLogRequest
  ): Promise<MachineMaintenanceLog> {
    return makeRequest<MachineMaintenanceLog>(
      `${this.BASE_URL}/${machineId}/maintenance-logs`,
      {
        method: "POST",
        body: JSON.stringify(data),
      }
    );
  }

  static async deleteMaintenanceLog(
    machineId: string,
    logId: string
  ): Promise<{ deleted: boolean }> {
    return makeRequest<{ deleted: boolean }>(
      `${this.BASE_URL}/${machineId}/maintenance-logs/${logId}`,
      { method: "DELETE" }
    );
  }
}

export const machinesQueryKeys = {
  all: ["machines"] as const,
  lists: () => [...machinesQueryKeys.all, "list"] as const,
  list: (params?: MachineQueryParams) => [...machinesQueryKeys.lists(), params] as const,
  details: () => [...machinesQueryKeys.all, "detail"] as const,
  detail: (id: string) => [...machinesQueryKeys.details(), id] as const,
  stats: () => [...machinesQueryKeys.all, "stats"] as const,
  logs: (id: string) => [...machinesQueryKeys.all, "logs", id] as const,
};
