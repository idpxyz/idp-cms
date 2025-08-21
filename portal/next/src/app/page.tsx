export default function HomePage() {
  return (
    <div style={{ padding: '2rem' }}>
      <h1>欢迎来到 IDP CMS</h1>
      <p>这是一个内容管理系统的主页。</p>
      <div style={{ marginTop: '2rem' }}>
        <h2>快速导航</h2>
        <ul>
          <li><a href="/feed">查看内容流</a></li>
          <li><a href="/api">API 端点</a></li>
        </ul>
      </div>
    </div>
  );
} 