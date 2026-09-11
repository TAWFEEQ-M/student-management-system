export function calculateResult(scores = {}, maximum = {}) {
  const fields = Object.keys(maximum);
  const total = fields.reduce((sum, field) => sum + Number(scores[field] || 0), 0);
  const max = fields.reduce((sum, field) => sum + Number(maximum[field] || 0), 0);
  const percentage = max ? Math.round(total / max * 100) : 0;
  const grade = percentage >= 90 ? "A+" : percentage >= 80 ? "A" : percentage >= 70 ? "B+" : percentage >= 60 ? "B" : percentage >= 50 ? "C" : percentage >= 40 ? "D" : "F";
  return { total, maximum: max, percentage, grade, result: percentage >= 40 ? "Pass" : "Fail" };
}
