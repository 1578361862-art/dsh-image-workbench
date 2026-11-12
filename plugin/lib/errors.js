// 统一的小型 HTTP 错误：路由层只认识 message/status/details。
export function fail(message, status = 400, details) {
  const err = new Error(message)
  err.status = status
  if (details && typeof details === 'object') err.details = details
  throw err
}
