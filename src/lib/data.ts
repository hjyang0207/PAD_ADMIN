export type AccountStatus = "active" | "inactive"

export interface PalliativeAccount {
  id: string | number
  org: string
  manager: string
  contact: string
  loginId?: string
  registeredAt: string
  status: AccountStatus
  hospitalId?: number | null
  hospitalCode?: string | null
  mustChangePassword?: boolean
  allocatedCodeCount?: number
  generatedCodeCount?: number
  remainingCodeCount?: number
  lastLoginAt?: string | null
  updatedAt?: string
}

export const accounts: PalliativeAccount[] = [
  { id: "a1", org: "서울성모병원 완화의료센터", manager: "김서연", contact: "02-2258-1004", loginId: "seoul@hospice.kr", registeredAt: "2025-11-02", status: "active" },
  { id: "a2", org: "국립암센터 호스피스완화의료실", manager: "박준호", contact: "031-920-1234", registeredAt: "2025-12-14", status: "active" },
  { id: "a3", org: "세브란스 가정형호스피스", manager: "이현정", contact: "02-2228-5000", registeredAt: "2026-01-08", status: "active" },
  { id: "a4", org: "부산대병원 완화의료팀", manager: "정민석", contact: "051-240-7000", registeredAt: "2026-02-20", status: "inactive" },
  { id: "a5", org: "충남대병원 호스피스병동", manager: "한지우", contact: "042-280-8100", registeredAt: "2026-03-11", status: "active" },
  { id: "a6", org: "대구가톨릭대병원 완화의료", manager: "오세훈", contact: "053-650-3000", registeredAt: "2026-04-02", status: "active" },
]

export interface OrgQuota {
  id: string
  org: string
  quota: number
  generated: number
  completed: number
  updatedAt: string
}

export const orgQuotas: OrgQuota[] = [
  { id: "q1", org: "서울성모병원 완화의료센터", quota: 300, generated: 264, completed: 191, updatedAt: "2026-08-24 14:22" },
  { id: "q2", org: "국립암센터 호스피스완화의료실", quota: 250, generated: 210, completed: 168, updatedAt: "2026-08-25 09:05" },
  { id: "q3", org: "세브란스 가정형호스피스", quota: 200, generated: 142, completed: 97, updatedAt: "2026-08-23 17:48" },
  { id: "q4", org: "부산대병원 완화의료팀", quota: 150, generated: 61, completed: 40, updatedAt: "2026-08-19 11:30" },
  { id: "q5", org: "충남대병원 호스피스병동", quota: 120, generated: 88, completed: 52, updatedAt: "2026-08-25 08:11" },
]

export interface Doctor {
  id: string
  name: string
  department: string
  email: string
  issued: number
  used: number
  status: AccountStatus
}

export const doctors: Doctor[] = [
  { id: "1", name: "윤재호 교수", department: "혈액종양내과", email: "jhyoon@hospice.kr", issued: 40, used: 31, status: "active" },
  { id: "2", name: "최수민 전문의", department: "가정의학과", email: "smchoi@hospice.kr", issued: 30, used: 22, status: "active" },
  { id: "3", name: "장현우 교수", department: "완화의료과", email: "hwjang@hospice.kr", issued: 25, used: 25, status: "active" },
  { id: "4", name: "김다은 전문의", department: "종양내과", email: "dekim@hospice.kr", issued: 20, used: 8, status: "inactive" },
]

export interface PatientResponse {
  id: string
  pin: string
  doctor: string
  patientInitial: string
  submittedAt: string
  status: "completed" | "unused" | "pending"
}

export const responses: PatientResponse[] = [
  { id: "r1", pin: "PLC-8F2A-7731", doctor: "윤재호 교수", patientInitial: "김O수", submittedAt: "2026-08-25 10:41", status: "completed" },
  { id: "r2", pin: "PLC-3B9C-2048", doctor: "최수민 전문의", patientInitial: "이O희", submittedAt: "2026-08-24 16:12", status: "completed" },
  { id: "r3", pin: "PLC-1D4E-9955", doctor: "장현우 교수", patientInitial: "박O철", submittedAt: "2026-08-24 09:33", status: "completed" },
  { id: "r4", pin: "PLC-6A0F-1120", doctor: "윤재호 교수", patientInitial: "—", submittedAt: "—", status: "pending" },
  { id: "r5", pin: "PLC-9E7B-4402", doctor: "최수민 전문의", patientInitial: "—", submittedAt: "—", status: "unused" },
  { id: "r6", pin: "PLC-2C5D-8817", doctor: "장현우 교수", patientInitial: "정O아", submittedAt: "2026-08-23 14:07", status: "completed" },
]
