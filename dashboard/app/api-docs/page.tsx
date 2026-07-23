"use client";

import React from "react";
import dynamic from "next/dynamic";
import "swagger-ui-react/swagger-ui.css";
import { Loader2 } from "lucide-react";

// Dynamically import SwaggerUI to prevent SSR window reference issues
const SwaggerUI = dynamic(() => import("swagger-ui-react"), {
  ssr: false,
  loading: () => (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
      <p className="text-sm text-muted-foreground animate-pulse">Loading API Documentation...</p>
    </div>
  ),
});

export default function ApiDocsPage() {
  React.useEffect(() => {
    const originalWarn = console.warn;
    console.warn = (...args: unknown[]) => {
      if (
        args[0] &&
        typeof args[0] === "string" &&
        (args[0].includes("UNSAFE_componentWillReceiveProps") || args[0].includes("ModelCollapse"))
      ) {
        return;
      }
      originalWarn(...args);
    };

    const originalError = console.error;
    console.error = (...args: unknown[]) => {
      if (
        args[0] &&
        typeof args[0] === "string" &&
        (args[0].includes("UNSAFE_componentWillReceiveProps") || args[0].includes("ModelCollapse"))
      ) {
        return;
      }
      originalError(...args);
    };

    return () => {
      console.warn = originalWarn;
      console.error = originalError;
    };
  }, []);

  return (
    <div className="w-full max-w-5xl mx-auto py-8 px-4 sm:px-6 lg:px-8 bg-card border border-border rounded-xl shadow-sm mt-4">
      <div className="border-b border-border pb-6 mb-6">
        <h1 className="text-3xl font-bold tracking-tight">API Reference Docs</h1>
        <p className="text-muted-foreground mt-2">
          Explore and interact with the DriftGuard security scanner REST endpoints.
        </p>
      </div>

      <div className="swagger-theme-wrapper">
        <SwaggerUI url="/api/docs" />
      </div>

      {/* Embedded CSS overrides to style Swagger UI to match our dark/light theme */}
      <style>{`
        .swagger-theme-wrapper .swagger-ui {
          font-family: var(--font-geist-sans), sans-serif !important;
        }
        
        /* Dark Mode overrides */
        .dark .swagger-theme-wrapper .swagger-ui {
          color: oklch(0.985 0 0) !important;
          background-color: transparent !important;
        }
        
        .dark .swagger-theme-wrapper .swagger-ui .info .title,
        .dark .swagger-theme-wrapper .swagger-ui .info p,
        .dark .swagger-theme-wrapper .swagger-ui .info a,
        .dark .swagger-theme-wrapper .swagger-ui .info li,
        .dark .swagger-theme-wrapper .swagger-ui .opblock .opblock-summary-operation-id,
        .dark .swagger-theme-wrapper .swagger-ui .opblock .opblock-summary-path,
        .dark .swagger-theme-wrapper .swagger-ui .opblock .opblock-summary-description,
        .dark .swagger-theme-wrapper .swagger-ui .tabli a,
        .dark .swagger-theme-wrapper .swagger-ui .response-col_status,
        .dark .swagger-theme-wrapper .swagger-ui .response-col_description,
        .dark .swagger-theme-wrapper .swagger-ui table thead tr td,
        .dark .swagger-theme-wrapper .swagger-ui table thead tr th,
        .dark .swagger-theme-wrapper .swagger-ui .opblock-description-wrapper p,
        .dark .swagger-theme-wrapper .swagger-ui .opblock-section-header h4,
        .dark .swagger-theme-wrapper .swagger-ui .responses-inner h5,
        .dark .swagger-theme-wrapper .swagger-ui .responses-inner h4,
        .dark .swagger-theme-wrapper .swagger-ui .parameter__name,
        .dark .swagger-theme-wrapper .swagger-ui .parameter__in,
        .dark .swagger-theme-wrapper .swagger-ui .model-box,
        .dark .swagger-theme-wrapper .swagger-ui .model,
        .dark .swagger-theme-wrapper .swagger-ui .model-title,
        .dark .swagger-theme-wrapper .swagger-ui section.models h4,
        .dark .swagger-theme-wrapper .swagger-ui .dialog-ux .modal-ux-header h3,
        .dark .swagger-theme-wrapper .swagger-ui .dialog-ux .modal-ux-content p {
          color: oklch(0.985 0 0) !important;
        }

        .dark .swagger-theme-wrapper .swagger-ui .scheme-container,
        .dark .swagger-theme-wrapper .swagger-ui .opblock,
        .dark .swagger-theme-wrapper .swagger-ui .dialog-ux .modal-ux {
          background-color: oklch(0.205 0 0) !important;
          border-color: oklch(1 0 0 / 10%) !important;
          box-shadow: none !important;
        }

        .dark .swagger-theme-wrapper .swagger-ui .opblock-section-header {
          background-color: oklch(0.269 0 0) !important;
          color: oklch(0.985 0 0) !important;
          border-color: oklch(1 0 0 / 10%) !important;
        }

        .dark .swagger-theme-wrapper .swagger-ui input[type=text],
        .dark .swagger-theme-wrapper .swagger-ui select,
        .dark .swagger-theme-wrapper .swagger-ui textarea {
          background-color: oklch(0.145 0 0) !important;
          color: oklch(0.985 0 0) !important;
          border-color: oklch(1 0 0 / 15%) !important;
        }

        .dark .swagger-theme-wrapper .swagger-ui .btn {
          background-color: oklch(0.269 0 0) !important;
          color: oklch(0.985 0 0) !important;
          border-color: oklch(1 0 0 / 15%) !important;
        }

        .dark .swagger-theme-wrapper .swagger-ui .btn:hover {
          background-color: oklch(0.205 0 0) !important;
        }

        .dark .swagger-theme-wrapper .swagger-ui .prop-type {
          color: oklch(0.704 0.191 22.216) !important;
        }

        .dark .swagger-theme-wrapper .swagger-ui .prop-format {
          color: oklch(0.708 0 0) !important;
        }
      `}</style>
    </div>
  );
}
