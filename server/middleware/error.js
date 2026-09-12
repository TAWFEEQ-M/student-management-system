export function notFound(req, res) { res.status(404).json({ message: `Route not found: ${req.method} ${req.originalUrl}` }); }
export function errorHandler(err, req, res, _next) {
  const status = err.status || (err.name === "ValidationError" || err.code === "P2003" ? 400 : err.code === "P2002" ? 409 : 500);
  res.status(status).json({ message: status === 500 ? "Internal server error" : err.message, ...(process.env.NODE_ENV === "development" ? { stack: err.stack } : {}) });
}
