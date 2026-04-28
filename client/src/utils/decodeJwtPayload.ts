export type GoogleJwtPayload = {
  email?: string;
  name?: string;
  picture?: string;
  given_name?: string;
};

export function decodeJwtPayload(token: string): GoogleJwtPayload {
  try {
    const part = token.split(".")[1];
    if (!part) return {};
    const base64 = part.replace(/-/g, "+").replace(/_/g, "/");
    const json = atob(base64);
    return JSON.parse(json) as GoogleJwtPayload;
  } catch {
    return {};
  }
}
