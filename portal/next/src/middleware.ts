import { NextRequest, NextResponse } from 'next/server';

// 站点分流中间件
export function middleware(request: NextRequest) {
  const { pathname, host } = request.nextUrl;

  // 获取请求的主机名
  const hostname = host.split(':')[0];

  // 定义站点类型
  const isPortal =
    hostname === 'portal.example.com' || hostname === 'localhost';
  const isLocalSite =
    hostname.includes('localsite') || hostname.includes('news');

  // 如果是API请求，直接放行
  if (pathname.startsWith('/api/')) {
    return NextResponse.next();
  }

  // 如果是静态资源，直接放行
  if (pathname.startsWith('/_next/') || pathname.startsWith('/favicon.ico')) {
    return NextResponse.next();
  }

  // 站点分流逻辑
  if (isPortal) {
    // 门户站点 - 显示聚合内容
    console.log(`🚪 Portal site: ${hostname} -> ${pathname}`);

    // 可以在这里添加门户特定的逻辑
    // 比如设置特定的响应头、重定向等
  } else if (isLocalSite) {
    // 本地站点 - 显示本地内容
    console.log(`🏠 Local site: ${hostname} -> ${pathname}`);

    // 可以在这里添加本地站点特定的逻辑
  } else {
    // 默认站点 - 根据配置决定
    console.log(`🌐 Default site: ${hostname} -> ${pathname}`);
  }

  // 添加站点标识响应头
  const response = NextResponse.next();
  response.headers.set(
    'X-Site-Type',
    isPortal ? 'portal' : isLocalSite ? 'localsite' : 'default'
  );
  response.headers.set('X-Hostname', hostname);

  return response;
}

// 配置中间件匹配的路径
export const config = {
  matcher: [
    /*
     * 匹配所有路径，除了：
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
