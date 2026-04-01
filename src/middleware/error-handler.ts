import type { ToolResult, McpError } from '../types/index.js';

export function createErrorResult(
  code: string,
  message: string,
  retryAfter?: number,
): ToolResult {
  const error: McpError = { error: code, message };
  if (retryAfter !== undefined) error.retryAfter = retryAfter;
  return {
    content: [{ type: 'text', text: JSON.stringify(error) }],
    isError: true,
  };
}

export function createSuccessResult(data: unknown): ToolResult {
  return {
    content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
  };
}

interface GoogleApiError extends Error {
  code?: number;
  errors?: Array<{ message: string; domain: string; reason: string }>;
}

function isGoogleApiError(error: unknown): error is GoogleApiError {
  return error instanceof Error && 'code' in error;
}

export function handleToolError(error: unknown): ToolResult {
  if (isGoogleApiError(error)) {
    switch (error.code) {
      case 400:
        return createErrorResult('INVALID_INPUT', error.message);
      case 401:
        return createErrorResult(
          'AUTH_EXPIRED',
          'Authentication expired. Please re-authenticate.',
        );
      case 403:
        return createErrorResult(
          'PERMISSION_DENIED',
          'Permission denied. Check that the spreadsheet is shared with your account.',
        );
      case 404:
        return createErrorResult('NOT_FOUND', 'Spreadsheet or range not found.');
      case 429:
        return createErrorResult(
          'RATE_LIMIT_EXCEEDED',
          'Google Sheets API rate limit reached. Try again in 60 seconds.',
          60,
        );
      default:
        return createErrorResult('API_ERROR', error.message);
    }
  }

  if (error instanceof Error) {
    return createErrorResult('INTERNAL_ERROR', error.message);
  }

  return createErrorResult('INTERNAL_ERROR', 'An unexpected error occurred');
}
