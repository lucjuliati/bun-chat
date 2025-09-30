
export function contentType(path: string): string {
  if (path.endsWith(".html")) return "text/html"
  if (path.endsWith(".css")) return "text/css"
  if (path.endsWith(".js")) return "application/javascript"
  if (path.endsWith(".json")) return "application/json"
  if (path.endsWith(".png")) return "image/png"
  if (path.endsWith(".jpg") || path.endsWith(".jpeg")) return "image/jpeg"
  return "application/octet-stream"
}
