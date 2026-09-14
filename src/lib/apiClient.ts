const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL ?? "").replace(/\/$/, "")

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly details?: unknown,
  ) {
    super(message)
    this.name = "ApiError"
  }
}

type RequestOptions = Omit<RequestInit, "body"> & {
  body?: unknown
  auth?: boolean
}

function getErrorMessage(status: number, payload: unknown) {
  if (payload && typeof payload === "object") {
    const body = payload as Record<string, unknown>
    const message = body.message ?? body.detail ?? body.error
    if (typeof message === "string" && message.trim()) return message
  }

  if (status === 401) return "로그인이 만료되었습니다. 다시 로그인해주세요."
  if (status === 403) return "이 작업을 수행할 권한이 없습니다."
  if (status === 404) return "요청한 데이터를 찾을 수 없습니다."
  if (status === 409) return "이미 존재하거나 현재 상태에서는 처리할 수 없습니다."
  if (status === 422) return "입력값을 다시 확인해주세요."
  return "요청 처리 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요."
}

export function isMockApi() {
  return import.meta.env.VITE_USE_MOCK_API === "true"
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { body, auth = true, headers: customHeaders, ...init } = options
  const headers = new Headers(customHeaders)
  headers.set("Accept", "application/json")

  if (body !== undefined) headers.set("Content-Type", "application/json")

  if (auth) {
    const token = sessionStorage.getItem("accessToken")
    const tokenType = sessionStorage.getItem("tokenType") || "Bearer"
    if (token) headers.set("Authorization", `${tokenType} ${token}`)
  }

  let response: Response
  try {
    response = await fetch(`${apiBaseUrl}${path}`, {
      ...init,
      credentials: "include",
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    })
  } catch {
    throw new ApiError("서버에 연결할 수 없습니다. 네트워크와 API 주소를 확인해주세요.", 0)
  }

  const contentType = response.headers.get("content-type") ?? ""
  const payload = response.status === 204
    ? undefined
    : contentType.includes("application/json")
      ? await response.json().catch(() => undefined)
      : await response.text().catch(() => undefined)

  if (!response.ok) {
    if (response.status === 401 && auth) window.dispatchEvent(new Event("pda:unauthorized"))
    throw new ApiError(getErrorMessage(response.status, payload), response.status, payload)
  }

  return payload as T
}

export async function apiRequestBlob(path: string, options: Omit<RequestOptions, "body"> = {}): Promise<Blob> {
  const { auth = true, headers: customHeaders, ...init } = options
  const headers = new Headers(customHeaders)

  if (auth) {
    const token = sessionStorage.getItem("accessToken")
    const tokenType = sessionStorage.getItem("tokenType") || "Bearer"
    if (token) headers.set("Authorization", `${tokenType} ${token}`)
  }

  let response: Response
  try {
    response = await fetch(`${apiBaseUrl}${path}`, {
      ...init,
      credentials: "include",
      headers,
    })
  } catch {
    throw new ApiError("서버에 연결할 수 없습니다. 네트워크와 API 주소를 확인해주세요.", 0)
  }

  if (!response.ok) {
    const contentType = response.headers.get("content-type") ?? ""
    const payload = contentType.includes("application/json")
      ? await response.json().catch(() => undefined)
      : await response.text().catch(() => undefined)
    if (response.status === 401 && auth) window.dispatchEvent(new Event("pda:unauthorized"))
    throw new ApiError(getErrorMessage(response.status, payload), response.status, payload)
  }

  return response.blob()
}

export function unwrapList<T>(payload: T[] | { items?: T[]; content?: T[]; data?: T[] }): T[] {
  if (Array.isArray(payload)) return payload
  return payload.items ?? payload.content ?? payload.data ?? []
}
