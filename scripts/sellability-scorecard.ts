import { buildSellabilityReport } from "../src/sellability.js";

const report = buildSellabilityReport(new Date());
console.log(
  JSON.stringify(
    {
      schemaVersion: report.schemaVersion,
      generatedAt: report.generatedAt,
      overallScore: report.overallScore,
      grade: report.overallGrade,
      criticalIssues: report.criticalIssues,
      products: report.products.map((product) => ({
        productId: product.productId,
        score: product.score,
        eligibleForPaidPreview: product.eligibleForPaidPreview,
        criticalIssues: product.issues.filter((issue) => issue.severity === "critical").length,
        warnings: product.issues.filter((issue) => issue.severity === "warning").length,
      })),
    },
    null,
    2,
  ),
);
