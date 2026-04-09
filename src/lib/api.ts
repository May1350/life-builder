export function apiUrl(path: string): string {
  return process.env.NEXT_PUBLIC_API_BASE
    ? `${process.env.NEXT_PUBLIC_API_BASE}${path}`
    : path;
}
