export function notFound(req, res) { res.status(404).json({ message: `Route not found: ${req.method} ${req.originalUrl}` }); }
export function errorHandler(err, req, res, _next) {
  const status = err.status || (err.name === "ValidationError" ? 400 : err.code === 11000 ? 409 : 500);
  res.status(status).json({ message: status === 500 ? "Internal server error" : err.message, ...(process.env.NODE_ENV === "development" ? { stack: err.stack } : {}) });
}
