export function notFound(req, res) { res.status(404).json({ message: `Route not found: ${req.method} ${req.originalUrl}` }); }
export function errorHandler(err, req, res, _next) {
  console.error(`${req.method} ${req.originalUrl}:`, err);
  const status = err.status || (err.name === "ValidationError" || err.code === "P2003" ? 400 : err.code === "P2002" ? 409 : 500);
  const isProduction = process.env.NODE_ENV === "production";
  res.status(status).json({ message: isProduction && status === 500 ? "Internal server error" : err.message || "Internal server error", ...(!isProduction ? { stack: err.stack } : {}) });
}
