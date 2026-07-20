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
      paths: {
        "/api/repos": {
          get: {
            summary: "List repositories",
            description: "Retrieve all repositories owned by the current authenticated user.",
            responses: {
              "200": {
                description: "A list of repositories.",
                content: {
                  "application/json": {
                    schema: {
                      type: "array",
                      items: { $ref: "#/components/schemas/RepoSummary" },
                    },
                  },
                },
              },
              "401": { description: "Unauthorized." },
            },
          },
        },
        "/api/repos/{id}": {
          get: {
            summary: "Retrieve repository details",
            description: "Fetch details of a specific repository by its ID, including the latest completed scan's drift report.",
            parameters: [
              {
                in: "path",
                name: "id",
                required: true,
                schema: { type: "string", format: "uuid" },
                description: "The repository ID.",
              },
            ],
            responses: {
              "200": {
                description: "Repository details.",
                content: {
                  "application/json": {
                    schema: {
                      allOf: [
                        { $ref: "#/components/schemas/RepoSummary" },
                        {
                          type: "object",
                          properties: {
                            latest_report: {
                              $ref: "#/components/schemas/DriftReport",
                              nullable: true,
                            },
                          },
                        },
                      ],
                    },
                  },
                },
              },
              "401": { description: "Unauthorized." },
              "404": { description: "Repository not found." },
            },
          },
        },
        "/api/scan": {
          post: {
            summary: "Start a new repository scan",
            description: "Registers a repository if it does not exist and schedules a new scan.",
            requestBody: {
              required: true,
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    required: ["url"],
                    properties: {
                      url: {
                        type: "string",
                        description: "The Git URL of the repository (HTTP/HTTPS).",
                      },
                    },
                  },
                },
              },
            },
            responses: {
              "201": {
                description: "Scan successfully scheduled.",
                content: {
                  "application/json": {
                    schema: {
                      type: "object",
                      properties: {
                        scan_id: { type: "string", format: "uuid" },
                      },
                    },
                  },
                },
              },
              "400": { description: "Invalid input or malformed URL." },
              "401": { description: "Unauthorized." },
            },
          },
        },
        "/api/scans/{id}": {
          get: {
            summary: "Retrieve scan status",
            description: "Fetch the current status and results of a scheduled scan.",
            parameters: [
              {
                in: "path",
                name: "id",
                required: true,
                schema: { type: "string", format: "uuid" },
                description: "The scan ID.",
              },
            ],
            responses: {
              "200": {
                description: "Scan details and findings.",
                content: {
                  "application/json": {
                    schema: {
                      allOf: [
                        { $ref: "#/components/schemas/Scan" },
                        {
                          type: "object",
                          properties: {
                            findings: {
                              type: "array",
                              items: { $ref: "#/components/schemas/Finding" },
                            },
                          },
                        },
                      ],
                    },
                  },
                },
              },
              "401": { description: "Unauthorized." },
              "404": { description: "Scan not found." },
            },
          },
        },
        "/api/report/{id}": {
          get: {
            summary: "Retrieve drift report",
            description: "Fetch the final drift report details for a completed scan.",
            parameters: [
              {
                in: "path",
                name: "id",
                required: true,
                schema: { type: "string", format: "uuid" },
                description: "The scan ID.",
              },
            ],
            responses: {
              "200": {
                description: "Completed drift report.",
                content: {
                  "application/json": {
                    schema: { $ref: "#/components/schemas/DriftReport" },
                  },
                },
              },
              "401": { description: "Unauthorized." },
              "404": { description: "Report not found or scan not completed." },
            },
          },
        },
      },
    },
  });
  return NextResponse.json(spec);
}
