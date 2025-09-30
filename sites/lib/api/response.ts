/**
 * 统一API响应工具
 * 标准化API响应格式和错误处理
 */

import { NextResponse } from 'next/server';
import { ApiResponse, PaginatedResponse, ApiError, ErrorCodes, ResponseMeta } from './types';

// 生成响应元数据
function createMeta(request_id?: string): ResponseMeta {
  return {
    timestamp: new Date().toISOString(),
    request_id: request_id || generateRequestId(),
    version: '1.0',
  };
}

// 生成请求ID
function generateRequestId(): string {
  return Math.random().toString(36).slice(2, 11);
}

// 成功响应
export function success<T>(
  data: T,
  message: string = 'Success',
  options: {
    meta?: Partial<ResponseMeta>;
    debug?: any;
    status?: number;
    headers?: Record<string, string>;
  } = {}
): NextResponse {
  const response: ApiResponse<T> = {
    success: true,
    message,
    data,
    meta: { ...createMeta(), ...options.meta },
    ...(process.env.NODE_ENV === 'development' && options.debug && { debug: options.debug }),
  };

  return NextResponse.json(response, {
    status: options.status || 200,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
}

// 分页响应
export function paginated<T>(
  items: T[],
  pagination: PaginatedResponse<T>['pagination'],
  message: string = 'Success',
  options: {
    meta?: Partial<ResponseMeta>;
    debug?: any;
    headers?: Record<string, string>;
  } = {}
): NextResponse {
  const response: PaginatedResponse<T> = {
    success: true,
    message,
    data: items,
    pagination,
    meta: { ...createMeta(), ...options.meta },
    ...(process.env.NODE_ENV === 'development' && options.debug && { debug: options.debug }),
  };

  return NextResponse.json(response, {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
}

// 错误响应
export function error(
  code: string,
  message: string,
  options: {
    status?: number;
    details?: Record<string, any>;
    field_errors?: Record<string, string[]>;
    retry_after?: number;
    meta?: Partial<ResponseMeta>;
    debug?: any;
  } = {}
): NextResponse {
  const apiError: ApiError = {
    code,
    message,
    ...(options.details && { details: options.details }),
    ...(options.field_errors && { field_errors: options.field_errors }),
    ...(options.retry_after && { retry_after: options.retry_after }),
  };

  const response: ApiResponse = {
    success: false,
    message,
    error: apiError,
    meta: { ...createMeta(), ...options.meta },
    ...(process.env.NODE_ENV === 'development' && options.debug && { debug: options.debug }),
  };

  return NextResponse.json(response, {
    status: options.status || 400,
    headers: {
      'Content-Type': 'application/json',
      ...(options.retry_after && { 'Retry-After': options.retry_after.toString() }),
    },
  });
}

// 常见错误响应快捷方法
export const ErrorResponses = {
  notFound(message: string = 'Resource not found', details?: any) {
    return error(ErrorCodes.NOT_FOUND, message, { status: 404, details });
  },

  badRequest(message: string = 'Invalid request', field_errors?: Record<string, string[]>) {
    return error(ErrorCodes.INVALID_REQUEST, message, { status: 400, field_errors });
  },

  unauthorized(message: string = 'Unauthorized') {
    return error(ErrorCodes.UNAUTHORIZED, message, { status: 401 });
  },

  forbidden(message: string = 'Forbidden') {
    return error(ErrorCodes.FORBIDDEN, message, { status: 403 });
  },

  rateLimited(retry_after: number = 60, message: string = 'Rate limit exceeded') {
    return error(ErrorCodes.RATE_LIMITED, message, { status: 429, retry_after });
  },

  internalError(message: string = 'Internal server error', details?: any) {
    return error(ErrorCodes.INTERNAL_ERROR, message, { status: 500, details });
  },

  serviceUnavailable(message: string = 'Service temporarily unavailable') {
    return error(ErrorCodes.SERVICE_UNAVAILABLE, message, { status: 503 });
  },

  articleNotFound(slug?: string) {
    return error(
      ErrorCodes.ARTICLE_NOT_FOUND,
      slug ? `Article '${slug}' not found` : 'Article not found',
      { status: 404, details: { slug } }
    );
  },

  invalidSlug(slug: string) {
    return error(ErrorCodes.INVALID_SLUG, `Invalid article slug: ${slug}`, {
      status: 400,
      details: { slug },
    });
  },

  circuitBreakerOpen(service: string) {
    return error(
      ErrorCodes.CIRCUIT_BREAKER_OPEN,
      `Service ${service} is temporarily unavailable`,
      { status: 503, details: { service } }
    );
  },

  timeout(service: string) {
    return error(ErrorCodes.TIMEOUT, `Request to ${service} timed out`, {
      status: 504,
      details: { service },
    });
  },
};

// 处理异常的工具函数
export function handleError(error: unknown, context?: string): NextResponse {
  console.error(`API Error${context ? ` in ${context}` : ''}:`, error);

  if (error instanceof Error) {
    // 根据错误类型返回适当的响应
    if (error.message.includes('timeout')) {
      return ErrorResponses.timeout(context || 'unknown');
    }
    if (error.message.includes('rate limit')) {
      return ErrorResponses.rateLimited();
    }
    if (error.message.includes('not found')) {
      return ErrorResponses.notFound();
    }
  }

  return ErrorResponses.internalError('An unexpected error occurred', {
    context,
    error: process.env.NODE_ENV === 'development' ? String(error) : undefined,
  });
}
