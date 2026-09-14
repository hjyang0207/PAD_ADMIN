import { ApiError, apiRequest, isMockApi } from "./apiClient"

/** `POST /manage/sign-in` 명세의 역할 값 */
export type ApiRole = "ADMIN" | "STAFF"

export interface SignInResponse {
  accessToken: string
  tokenType?: string
  expiresIn: number
  role: ApiRole
  hospitalId: number | null
  mustChangePassword: boolean
}

export async function signIn(loginId: string, password: string): Promise<SignInResponse> {
  if (isMockApi()) {
    await new Promise((resolve) => setTimeout(resolve, 200))
    return {
      accessToken: "mock-access-token",
      tokenType: "Bearer",
      expiresIn: 3600,
      role: loginId.toLowerCase().startsWith("admin") ? "ADMIN" : "STAFF",
      hospitalId: loginId.toLowerCase().startsWith("system") ? null : 1,
      mustChangePassword: false,
    }
  }
  try {
    return await apiRequest<SignInResponse>("/manage/sign-in", {
      method: "POST",
      auth: false,
      body: { loginId, password },
    })
  } catch (error) {
    if (error instanceof ApiError && error.status === 422) {
      throw new Error("이메일 또는 비밀번호를 다시 확인해주세요.")
    }
    throw error
  }
}

export async function changePassword(currentPassword: string, newPassword: string) {
  if (isMockApi()) return
  await apiRequest<void>("/manage/password", {
    method: "PUT",
    body: { currentPassword, newPassword },
  })
}

export function saveSession(session: SignInResponse) {
  const tokenType = session.tokenType
    ? session.tokenType.charAt(0).toUpperCase() + session.tokenType.slice(1).toLowerCase()
    : "Bearer"
  const expiresAt = Date.now() + session.expiresIn * 1000

  sessionStorage.setItem("accessToken", session.accessToken)
  sessionStorage.setItem("tokenType", tokenType)
  sessionStorage.setItem("expiresAt", String(expiresAt))
  sessionStorage.setItem("role", session.role)
  sessionStorage.setItem("hospitalId", session.hospitalId === null ? "" : String(session.hospitalId))
  sessionStorage.setItem("mustChangePassword", String(session.mustChangePassword))
}

export function clearSession() {
  for (const key of ["accessToken", "tokenType", "expiresAt", "role", "hospitalId", "mustChangePassword"]) {
    sessionStorage.removeItem(key)
  }
}

export function restoreSession(): SignInResponse | null {
  const accessToken = sessionStorage.getItem("accessToken")
  const role = sessionStorage.getItem("role") as ApiRole | null
  const expiresAt = Number(sessionStorage.getItem("expiresAt"))
  if (!accessToken || !role || !Number.isFinite(expiresAt) || expiresAt <= Date.now()) {
    clearSession()
    return null
  }

  const hospitalId = sessionStorage.getItem("hospitalId")
  return {
    accessToken,
    tokenType: sessionStorage.getItem("tokenType") ?? "Bearer",
    expiresIn: Math.max(0, Math.floor((expiresAt - Date.now()) / 1000)),
    role,
    hospitalId: hospitalId ? Number(hospitalId) : null,
    mustChangePassword: sessionStorage.getItem("mustChangePassword") === "true",
  }
}
