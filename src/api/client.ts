export const CLOUD_BACKEND_URL = "https://booking-api-fdgxg9cbc6chbqc8.francecentral-01.azurewebsites.net";
export const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? CLOUD_BACKEND_URL;
export const AUTH_BASE_URL = process.env.EXPO_PUBLIC_AUTH_BASE_URL ?? API_BASE_URL;

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number
  ) {
    super(message);
  }
}

type RequestOptions = RequestInit & {
  text?: boolean;
};

export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    credentials: "include",
    headers: {
      Accept: "application/json",
      ...(options.body instanceof FormData ? {} : { "Content-Type": "application/json" }),
      ...options.headers
    }
  });

  if (!response.ok) {
    let message = `${response.status} ${response.statusText}`;
    try {
      const payload = await response.json();
      message = payload.error ?? JSON.stringify(payload);
    } catch {
      try {
        message = await response.text();
      } catch {
        // keep status text
      }
    }
    throw new ApiError(message, response.status);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  if (options.text) {
    return (await response.text()) as T;
  }

  return (await response.json()) as T;
}

export const asJson = (value: unknown) => JSON.stringify(value);

export function appendFile(form: FormData, name: string, asset: { uri: string; name?: string; mimeType?: string | null }) {
  form.append(name, {
    uri: asset.uri,
    name: asset.name ?? "photo.jpg",
    type: asset.mimeType ?? "image/jpeg"
  } as unknown as Blob);
}
