import { accounts as accountSeed, doctors as doctorSeed, orgQuotas as quotaSeed, responses as responseSeed } from "./data";
import type { AccountStatus, Doctor, OrgQuota, PalliativeAccount, PatientResponse } from "./data";
import { apiRequest, apiRequestBlob, isMockApi, unwrapList } from "./apiClient";

let mockAccounts = structuredClone(accountSeed);
let mockQuotas = structuredClone(quotaSeed);
let mockDoctors = structuredClone(doctorSeed);
let mockResponses = structuredClone(responseSeed);
const delay = () => new Promise((resolve) => setTimeout(resolve, 150));

export interface CreateHospitalInput {
  hospitalCode: string;
  institutionName: string;
  name: string;
  contactPhone: string;
  loginId: string;
  initialPassword: string;
}

export interface CreateDoctorInput {
  name: string;
  department: string;
  email: string;
}

export interface UpdateDoctorInput {
  name?: string | null;
  department?: string | null;
  email?: string | null;
  isActive?: boolean | null;
}

export interface CodeSummary {
  allocatedCodeCount: number;
  generatedCodeCount: number;
  redeemedCodeCount: number;
  remainingCodeCount: number;
}

export interface InstitutionCodeStatus extends CodeSummary {
  hospitalId: number;
  hospitalName: string;
  staffId: number;
  staffName: string;
  updatedAt: string;
}

export interface CodeStatusResult {
  total: CodeSummary;
  institutions: InstitutionCodeStatus[];
}

export type ResultCategory = "ALL" | "COMPLETED" | "UNUSED";

export interface ResultBoardStats {
  totalIssuedCount: number;
  responseCompletedCount: number;
  unusedCount: number;
}

export interface ResultBoardItem {
  // Unique number associated with patientName, not the result row ID.
  codeId: number | null;
  pin: string;
  userId: number | null;
  providerId: number | null;
  providerName: string | null;
  patientName: string | null;
  registrationNumber: string | null;
  submittedAt: string | null;
  state: "COMPLETED" | "UNUSED";
  recordId: number | null;
  resultAvailable: boolean;
}

export interface ResultBoardResponse {
  total: number;
  page: number;
  pageSize: number;
  stats: ResultBoardStats;
  items: ResultBoardItem[];
}

export interface StaffListParams {
  hospitalId?: number;
  search?: string;
  page?: number;
  pageSize?: number;
}

export interface StaffListResult {
  total: number;
  page: number;
  pageSize: number;
  items: PalliativeAccount[];
}

interface StaffAccountResponse {
  id: number;
  role: "ADMIN" | "STAFF";
  hospitalId: number | null;
  hospitalCode: string | null;
  hospitalName: string | null;
  name: string;
  contactPhone: string | null;
  loginId: string;
  isActive: boolean;
  mustChangePassword: boolean;
  allocatedCodeCount: number;
  generatedCodeCount: number;
  remainingCodeCount: number;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
}

interface StaffListResponse {
  total: number;
  page: number;
  pageSize: number;
  items: StaffAccountResponse[];
}

function toPalliativeAccount(item: StaffAccountResponse): PalliativeAccount {
  return {
    id: item.id,
    org: item.hospitalName ?? "—",
    manager: item.name,
    contact: item.contactPhone ?? "—",
    loginId: item.loginId,
    registeredAt: item.createdAt,
    status: item.isActive ? "active" : "inactive",
    hospitalId: item.hospitalId,
    hospitalCode: item.hospitalCode,
    mustChangePassword: item.mustChangePassword,
    allocatedCodeCount: item.allocatedCodeCount,
    generatedCodeCount: item.generatedCodeCount,
    remainingCodeCount: item.remainingCodeCount,
    lastLoginAt: item.lastLoginAt,
    updatedAt: item.updatedAt,
  };
}

export interface UpdateStaffInput {
  hospitalCode?: string | null;
  institutionName?: string | null;
  name?: string | null;
  isActive?: boolean | null;
  contactPhone?: string | null;
  loginId?: string | null;
  initialPassword?: string | null;
}

export async function listHospitals({ hospitalId, search, page = 1, pageSize = 20 }: StaffListParams = {}): Promise<StaffListResult> {
  if (isMockApi()) {
    await delay();
    const normalizedSearch = search?.trim().toLowerCase() ?? "";
    const matched = mockAccounts.filter((account) => !normalizedSearch || [account.org, account.manager, account.contact].some((value) => value.toLowerCase().includes(normalizedSearch)));
    const start = (page - 1) * pageSize;
    return { total: matched.length, page, pageSize, items: structuredClone(matched.slice(start, start + pageSize)) };
  }

  const params = new URLSearchParams({ page: String(page), page_size: String(pageSize) });
  if (hospitalId !== undefined) params.set("hospital_id", String(hospitalId));
  if (search?.trim()) params.set("search", search.trim());
  const payload = await apiRequest<StaffListResponse>(`/admin/staff?${params.toString()}`);

  return {
    total: payload.total,
    page: payload.page,
    pageSize: payload.pageSize,
    items: payload.items.map(toPalliativeAccount),
  };
}

export async function createHospital(input: CreateHospitalInput) {
  if (isMockApi()) {
    await delay();
    const row: PalliativeAccount = {
      id: crypto.randomUUID(),
      org: input.institutionName,
      manager: input.name,
      contact: input.contactPhone,
      loginId: input.loginId,
      hospitalCode: input.hospitalCode,
      registeredAt: new Date().toISOString(),
      status: "active",
      mustChangePassword: true,
      allocatedCodeCount: 0,
      generatedCodeCount: 0,
      remainingCodeCount: 0,
    };
    mockAccounts = [row, ...mockAccounts];
    return row;
  }
  const response = await apiRequest<StaffAccountResponse>("/admin/staff", { method: "POST", body: input });
  return toPalliativeAccount(response);
}

export async function updateStaffAccount(id: string | number, input: UpdateStaffInput): Promise<PalliativeAccount> {
  if (isMockApi()) {
    await delay();
    const current = mockAccounts.find((account) => account.id === id);
    if (!current) throw new Error("수정할 완화의료 계정을 찾을 수 없습니다.");
    const updated: PalliativeAccount = {
      ...current,
      hospitalCode: input.hospitalCode ?? current.hospitalCode,
      org: input.institutionName ?? current.org,
      manager: input.name ?? current.manager,
      contact: input.contactPhone ?? current.contact,
      loginId: input.loginId ?? current.loginId,
      status: input.isActive === undefined || input.isActive === null ? current.status : input.isActive ? "active" : "inactive",
      mustChangePassword: input.initialPassword ? true : current.mustChangePassword,
      updatedAt: new Date().toISOString(),
    };
    mockAccounts = mockAccounts.map((account) => (account.id === id ? updated : account));
    return structuredClone(updated);
  }
  const response = await apiRequest<StaffAccountResponse>(`/admin/staff/${encodeURIComponent(id)}`, { method: "PATCH", body: input });
  return toPalliativeAccount(response);
}

export async function setHospitalStatus(id: string | number, status: AccountStatus) {
  return updateStaffAccount(id, { isActive: status === "active" });
}

export async function deleteHospital(id: string | number) {
  if (isMockApi()) {
    await delay();
    mockAccounts = mockAccounts.filter((r) => r.id !== id);
    return;
  }
  await apiRequest<{ message: string }>(`/admin/staff/${encodeURIComponent(id)}`, { method: "DELETE" });
}

export async function listCodeStatus(): Promise<CodeStatusResult> {
  if (isMockApi()) {
    await delay();
    const institutions = mockQuotas.map((quota, index) => ({
      hospitalId: index + 1,
      hospitalName: quota.org,
      staffId: index + 1,
      staffName: "완화의료 담당자",
      allocatedCodeCount: quota.quota,
      generatedCodeCount: quota.generated,
      redeemedCodeCount: quota.completed,
      remainingCodeCount: quota.quota - quota.generated,
      updatedAt: quota.updatedAt,
    }));
    const total = institutions.reduce<CodeSummary>(
      (summary, institution) => ({
        allocatedCodeCount: summary.allocatedCodeCount + institution.allocatedCodeCount,
        generatedCodeCount: summary.generatedCodeCount + institution.generatedCodeCount,
        redeemedCodeCount: summary.redeemedCodeCount + institution.redeemedCodeCount,
        remainingCodeCount: summary.remainingCodeCount + institution.remainingCodeCount,
      }),
      { allocatedCodeCount: 0, generatedCodeCount: 0, redeemedCodeCount: 0, remainingCodeCount: 0 },
    );
    return { total, institutions };
  }
  return apiRequest<CodeStatusResult>("/admin/codes");
}

export async function grantStaffQuota(staffId: number, count: number): Promise<PalliativeAccount> {
  if (isMockApi()) {
    await delay();
    const index = staffId - 1;
    const quota = mockQuotas[index];
    if (!quota) throw new Error("한도를 부여할 완화의료 계정을 찾을 수 없습니다.");
    const updatedAt = new Date().toISOString();
    mockQuotas[index] = { ...quota, quota: quota.quota + count, updatedAt };
    return {
      id: staffId,
      org: quota.org,
      manager: "완화의료 담당자",
      contact: "",
      registeredAt: updatedAt,
      status: "active",
      allocatedCodeCount: quota.quota + count,
      generatedCodeCount: quota.generated,
      remainingCodeCount: quota.quota + count - quota.generated,
      updatedAt,
    };
  }
  const response = await apiRequest<StaffAccountResponse>(`/admin/staff/${encodeURIComponent(staffId)}/quota`, {
    method: "POST",
    body: { count },
  });
  return toPalliativeAccount(response);
}

export interface ProviderListParams {
  isActive?: boolean;
  page?: number;
  pageSize?: number;
}

export interface ProviderListResult {
  total: number;
  page: number;
  pageSize: number;
  items: Doctor[];
}

interface ProviderResponse {
  id: number;
  hospitalId: number;
  department: string | null;
  name: string;
  email: string;
  issuedCodeCount: number;
  usedCodeCount: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ProviderDetail extends ProviderResponse {}

interface ProviderListResponse {
  total: number;
  page: number;
  pageSize: number;
  items: ProviderResponse[];
}

function toDoctor(item: ProviderResponse): Doctor {
  return {
    id: String(item.id),
    name: item.name,
    department: item.department ?? "—",
    email: item.email,
    issued: item.issuedCodeCount,
    used: item.usedCodeCount,
    status: item.isActive ? "active" : "inactive",
  };
}

export async function listDoctors({ isActive, page = 1, pageSize = 20 }: ProviderListParams = {}): Promise<ProviderListResult> {
  if (isMockApi()) {
    await delay();
    const filtered = mockDoctors.filter((doctor) => isActive === undefined || (doctor.status === "active") === isActive);
    const start = (page - 1) * pageSize;
    return { total: filtered.length, page, pageSize, items: structuredClone(filtered.slice(start, start + pageSize)) };
  }
  const params = new URLSearchParams({ page: String(page), page_size: String(pageSize) });
  if (isActive !== undefined) params.set("is_active", String(isActive));
  const payload = await apiRequest<ProviderListResponse>(`/staff/providers?${params.toString()}`);
  return {
    total: payload.total,
    page: payload.page,
    pageSize: payload.pageSize,
    items: payload.items.map(toDoctor),
  };
}

export async function createDoctor(input: CreateDoctorInput) {
  if (isMockApi()) {
    await delay();
    const row: Doctor = { id: crypto.randomUUID(), ...input, issued: 0, used: 0, status: "active" };
    mockDoctors = [...mockDoctors, row];
    return row;
  }
  const response = await apiRequest<ProviderResponse>("/staff/providers", { method: "POST", body: input });
  return toDoctor(response);
}

export async function updateDoctor(id: string | number, input: UpdateDoctorInput): Promise<Doctor> {
  if (isMockApi()) {
    await delay();
    const current = mockDoctors.find((doctor) => String(doctor.id) === String(id));
    if (!current) throw new Error("수정할 의사을 찾을 수 없습니다.");
    const updated: Doctor = {
      ...current,
      name: input.name ?? current.name,
      department: input.department ?? current.department,
      email: input.email ?? current.email,
      status: input.isActive === null || input.isActive === undefined ? current.status : input.isActive ? "active" : "inactive",
    };
    mockDoctors = mockDoctors.map((doctor) => (String(doctor.id) === String(id) ? updated : doctor));
    return updated;
  }
  const response = await apiRequest<ProviderResponse>(`/staff/providers/${encodeURIComponent(id)}`, { method: "PATCH", body: input });
  return toDoctor(response);
}

export async function getDoctorDetail(id: string | number): Promise<ProviderDetail> {
  if (isMockApi()) {
    await delay();
    const doctor = mockDoctors.find((item) => String(item.id) === String(id));
    if (!doctor) throw new Error("의사 정보를 찾을 수 없습니다.");
    const now = new Date().toISOString();
    return {
      id: Number(doctor.id) || 0,
      hospitalId: 1,
      department: doctor.department === "—" ? null : doctor.department,
      name: doctor.name,
      email: doctor.email,
      issuedCodeCount: doctor.issued,
      usedCodeCount: doctor.used,
      isActive: doctor.status === "active",
      createdAt: now,
      updatedAt: now,
    };
  }
  return apiRequest<ProviderDetail>(`/staff/providers/${encodeURIComponent(id)}`);
}

export interface CodeBatchResult {
  batchId: number;
  hospitalId: number;
  providerId: number;
  count: number;
  codes: string[];
  remainingCodeCount: number;
  excelUrl: string;
  createdAt: string;
}

export async function issueCodes(providerId: number, count: number): Promise<CodeBatchResult> {
  if (isMockApi()) {
    await delay();
    const doctor = mockDoctors.find((item) => String(item.id) === String(providerId));
    if (!doctor) throw new Error("고유번호를 발급할 의사을 찾을 수 없습니다.");
    mockDoctors = mockDoctors.map((item) => (String(item.id) === String(providerId) ? { ...item, issued: item.issued + count } : item));
    return {
      batchId: Date.now(),
      hospitalId: 1,
      providerId,
      count,
      codes: Array.from({ length: count }, (_, index) => `PDA-${providerId.toString().padStart(2, "0")}-${(Date.now() + index).toString().slice(-6)}`),
      remainingCodeCount: 150 - mockDoctors.reduce((sum, item) => sum + item.issued, 0),
      excelUrl: "#",
      createdAt: new Date().toISOString(),
    };
  }
  return apiRequest<CodeBatchResult>("/staff/code_batches", { method: "POST", body: { count, providerId } });
}

export async function downloadUnusedCodes(providerId: number): Promise<Blob> {
  if (isMockApi()) {
    await delay();
    return new Blob(["PIN,발급일\n"], { type: "text/csv;charset=utf-8" });
  }
  return apiRequestBlob(`/staff/providers/${encodeURIComponent(providerId)}/codes.xlsx`);
}

export async function downloadSignupQr(): Promise<Blob> {
  if (isMockApi()) {
    await delay();
    return new Blob([], { type: "image/png" });
  }
  return apiRequestBlob("/auth/qr", { auth: false });
}

export async function listResponses() {
  if (isMockApi()) {
    await delay();
    return structuredClone(mockResponses);
  }
  const payload = await apiRequest<PatientResponse[] | { items?: PatientResponse[]; content?: PatientResponse[]; data?: PatientResponse[] }>("/manage/responses");
  return unwrapList(payload);
}

export async function getResponseDetail(id: string) {
  if (isMockApi()) {
    await delay();
    return mockResponses.find((r) => r.id === id) ?? null;
  }
  return apiRequest<unknown>(`/manage/responses/${encodeURIComponent(id)}`);
}

export async function listStaffResults({ category = "ALL", page = 1, pageSize = 20 }: { category?: ResultCategory; page?: number; pageSize?: number } = {}): Promise<ResultBoardResponse> {
  if (isMockApi()) {
    await delay();
    const patientCodeIds = new Map(
      [...new Set(mockResponses.map((response) => response.patientInitial).filter((name) => name !== "—"))]
        .map((name, index) => [name, index + 1] as const),
    );
    const mapped = mockResponses.map<ResultBoardItem>((response, index) => ({
      codeId: patientCodeIds.get(response.patientInitial) ?? null,
      pin: response.pin,
      userId: response.status === "completed" ? index + 1 : null,
      providerId: index + 1,
      providerName: response.doctor,
      patientName: response.patientInitial === "—" ? null : response.patientInitial,
      registrationNumber: null,
      submittedAt: response.status === "completed" ? response.submittedAt : null,
      state: response.status === "completed" ? "COMPLETED" : "UNUSED",
      recordId: response.status === "completed" ? index + 1 : null,
      resultAvailable: response.status === "completed",
    }));
    const itemsByCategory = category === "ALL" ? mapped : mapped.filter((item) => item.state === category);
    const start = (page - 1) * pageSize;
    return {
      total: itemsByCategory.length,
      page,
      pageSize,
      stats: {
        totalIssuedCount: mapped.length,
        responseCompletedCount: mapped.filter((item) => item.state === "COMPLETED").length,
        unusedCount: mapped.filter((item) => item.state === "UNUSED").length,
      },
      items: itemsByCategory.slice(start, start + pageSize),
    };
  }
  const params = new URLSearchParams({ category, page: String(page), page_size: String(pageSize) });
  return apiRequest<ResultBoardResponse>(`/staff/results?${params.toString()}`);
}

export async function getPdaResultPdf(recordId: number): Promise<Blob> {
  return apiRequestBlob(`/staff/results/${encodeURIComponent(recordId)}/pdf`, {
    headers: { Accept: "application/pdf" },
  });
}
