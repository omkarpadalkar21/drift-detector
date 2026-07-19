import { NextResponse } from "next/server";
import { createSwaggerSpec } from "next-swagger-doc";

/**
 * @swagger
 * components:
 *   schemas:
 *     Severity:
 *       type: string
 *       enum: [critical, high, medium, low]
 *     Finding:
 *       type: object
 *       required: [id, file, commit, author, timestamp, severity, score, confidence, change_summary, evidence, explanation, remediation]
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         file:
 *           type: string
 *         commit:
 *           type: string
 *         author:
 *           type: string
 *         timestamp:
 *           type: string
 *           format: date-time
 *         severity:
 *           $ref: '#/components/schemas/Severity'
 *         score:
 *           type: number
 *         confidence:
 *           type: number
 *         change_summary:
 *           type: string
 *         evidence:
 *           type: object
 *           required: [added, rules, pattern_match]
 *           properties:
 *             added:
 *               type: array
 *               items:
 *                 type: string
 *             removed:
 *               type: array
 *               items:
 *                 type: string
 *             rules:
 *               type: array
 *               items:
 *                 type: string
 *             pattern_match:
 *               type: number
 *         explanation:
 *           type: string
 *         remediation:
 *           type: string
 *     DriftReport:
 *       type: object
 *       required: [repo, drift_score, summary, findings, trend]
 *       properties:
 *         repo:
 *           type: string
 *         drift_score:
 *           type: number
 *         summary:
 *           type: object
 *           required: [changes_scanned, critical, high, medium, low]
 *           properties:
 *             changes_scanned:
 *               type: number
 *             critical:
 *               type: number
 *             high:
 *               type: number
 *             medium:
 *               type: number
 *             low:
 *               type: number
 *         findings:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/Finding'
 *         trend:
 *           type: array
 *           items:
 *             type: object
 *             required: [date, score]
 *             properties:
 *               date:
 *                 type: string
 *                 format: date-time
 *               score:
 *                 type: number
 *     RepoSummary:
 *       type: object
 *       required: [id, url, name, last_scan_at, latest_drift_score]
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         url:
 *           type: string
 *         name:
 *           type: string
 *         last_scan_at:
 *           type: string
 *           format: date-time
 *           nullable: true
 *         latest_drift_score:
 *           type: number
 *           nullable: true
 *     Scan:
 *       type: object
 *       required: [id, repo_id, status, started_at]
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         repo_id:
 *           type: string
 *           format: uuid
 *         status:
 *           type: string
 *           enum: [queued, cloning, mining, analyzing, completed, failed]
 *         started_at:
 *           type: string
 *           format: date-time
 *         finished_at:
 *           type: string
 *           format: date-time
 *           nullable: true
 *         error:
 *           type: string
 *           nullable: true
 */

export async function GET() {
  const spec = createSwaggerSpec({
    apiFolder: "app/api",
    definition: {
      openapi: "3.0.0",
      info: {
        title: "DriftGuard API",
        version: "1.0.0",
        description:
          "API specifications for DriftGuard. Note: Authentication is session-cookie based via better-auth (`better-auth.session_token` and `__secure-better-auth.session_token` cookies) and is not part of the request-body contracts.",
      },
      components: {
        securitySchemes: {
          sessionCookie: {
            type: "apiKey",
            in: "cookie",
            name: "better-auth.session_token",
            description: "Session cookie set automatically by better-auth.",
          },
        },
      },
      security: [
        {
          sessionCookie: [],
        },
      ],
    },
  });
  return NextResponse.json(spec);
}
