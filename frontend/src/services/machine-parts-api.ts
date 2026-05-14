import { makeRequest } from "@/services/api-utils";

export type MachinePartStatus = "active" | "replaced" | "retired";
export type ReplacementReason = "preventive" | "failure" | "upgrade" | "other";

export interface MachinePart {
  id: string;
  machine_id: string;
  name: string;
  part_code?: string;
  position?: string;
  quantity: number;
  manufacturer?: string;
  model_number?: string;
  installed_at?: string;
  expected_lifespan_days?: number;
  last_replaced_at?: string;
  next_replacement_date?: string;
  status: MachinePartStatus;
  notes?: string;
  is_active: boolean;
  created_at: string;
  updated_at?: string;
}

export interface MachinePartReplacement {
  id: string;
  machine_part_id: string;
  maintenance_log_id?: string;
  replaced_at: string;
  reason: ReplacementReason;
  technician?: string;
  cost: number;
  next_replacement_date?: string;
  notes?: string;
  created_at: string;
  updated_at?: string;
}

export interface CreateMachinePartRequest {
  name: string;
  part_code?: string;
  position?: string;
  quantity?: number;
  manufacturer?: string;
  model_number?: string;
  installed_at?: string;
  expected_lifespan_days?: number;
  last_replaced_at?: string;
  next_replacement_date?: string;
  status?: MachinePartStatus;
  notes?: string;
}

export interface UpdateMachinePartRequest extends Partial<CreateMachinePartRequest> {
  is_active?: boolean;
}

export interface CreateMachinePartReplacementRequest {
  reason: ReplacementReason;
  replaced_at?: string;
  technician?: string;
  cost?: number;
  next_replacement_date?: string;
  notes?: string;
  maintenance_log_id?: number | null;
}

export interface MachinePartQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: MachinePartStatus;
  is_active?: boolean;
  overdue_only?: boolean;
  sort_by?: "name" | "part_code" | "status" | "next_replacement_date" | "created_at";
  sort_order?: "asc" | "desc";
}

function toQueryString(params?: Record<string, unknown>): string {
  if (!params) return "";
  const entries = Object.entries(params).reduce((acc, [key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      acc[key] = String(value);
    }
    return acc;
  }, {} as Record<string, string>);
  const qs = new URLSearchParams(entries).toString();
  return qs ? `?${qs}` : "";
}

export class MachinePartsApiService {
  private static readonly BASE_URL = "/factory/machines";

  static async listParts(
    machineId: string,
    params?: MachinePartQueryParams
  ): Promise<{
    parts: MachinePart[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    return makeRequest(
      `${this.BASE_URL}/${machineId}/parts${toQueryString(
        params as Record<string, unknown> | undefined
      )}`
    );
  }

  static async getPart(machineId: string, partId: string): Promise<MachinePart> {
    return makeRequest<MachinePart>(
      `${this.BASE_URL}/${machineId}/parts/${partId}`
    );
  }

  static async createPart(
    machineId: string,
    data: CreateMachinePartRequest
  ): Promise<MachinePart> {
    return makeRequest<MachinePart>(`${this.BASE_URL}/${machineId}/parts`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  static async updatePart(
    machineId: string,
    partId: string,
    data: UpdateMachinePartRequest
  ): Promise<MachinePart> {
    return makeRequest<MachinePart>(
      `${this.BASE_URL}/${machineId}/parts/${partId}`,
      {
        method: "PUT",
        body: JSON.stringify(data),
      }
    );
  }

  static async deletePart(
    machineId: string,
    partId: string
  ): Promise<{ deleted: boolean }> {
    return makeRequest<{ deleted: boolean }>(
      `${this.BASE_URL}/${machineId}/parts/${partId}`,
      { method: "DELETE" }
    );
  }

  static async listReplacements(
    machineId: string,
    partId: string,
    params?: { page?: number; limit?: number }
  ): Promise<{
    replacements: MachinePartReplacement[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    return makeRequest(
      `${this.BASE_URL}/${machineId}/parts/${partId}/replacements${toQueryString(params)}`
    );
  }

  static async createReplacement(
    machineId: string,
    partId: string,
    data: CreateMachinePartReplacementRequest
  ): Promise<MachinePartReplacement> {
    return makeRequest<MachinePartReplacement>(
      `${this.BASE_URL}/${machineId}/parts/${partId}/replacements`,
      {
        method: "POST",
        body: JSON.stringify(data),
      }
    );
  }

  static async deleteReplacement(
    machineId: string,
    partId: string,
    replacementId: string
  ): Promise<{ deleted: boolean }> {
    return makeRequest<{ deleted: boolean }>(
      `${this.BASE_URL}/${machineId}/parts/${partId}/replacements/${replacementId}`,
      { method: "DELETE" }
    );
  }
}

export const machinePartsQueryKeys = {
  all: ["machine-parts"] as const,
  lists: (machineId: string) =>
    [...machinePartsQueryKeys.all, "list", machineId] as const,
  list: (machineId: string, params?: MachinePartQueryParams) =>
    [...machinePartsQueryKeys.lists(machineId), params] as const,
  details: (machineId: string) =>
    [...machinePartsQueryKeys.all, "detail", machineId] as const,
  detail: (machineId: string, partId: string) =>
    [...machinePartsQueryKeys.details(machineId), partId] as const,
  replacements: (machineId: string, partId: string) =>
    [...machinePartsQueryKeys.all, "replacements", machineId, partId] as const,
};
