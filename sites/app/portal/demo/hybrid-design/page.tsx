"use client";

import React from "react";
import Link from "next/link";

// 参考BBC风格的新闻数据模型
const breakingNews = {
  id: 1,
  title: "国际气候峰会达成历史性减排协议",
  summary: "195个国家代表团经过72小时马拉松式谈判，就2030年全球碳减排目标达成共识",
  time: "发布于 2小时前",
  location: "巴黎",
  isBreaking: true
};

const featuredStories = [
  {
    id: 1,
    title: "中国经济三季度数据超预期增长，GDP同比增长5.2%",
    subtitle: "国家统计局最新数据显示，消费复苏和出口增长成为主要推动力，专家预测四季度将延续稳健增长态势",
    image: "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAwIiBoZWlnaHQ9IjQwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZGVmcz48bGluZWFyR3JhZGllbnQgaWQ9ImEiIHgxPSIwJSIgeTE9IjAlIiB4Mj0iMTAwJSIgeTI9IjEwMCUiPjxzdG9wIG9mZnNldD0iMCUiIHN0b3AtY29sb3I9IiMxZjI5MzciLz48c3RvcCBvZmZzZXQ9IjEwMCUiIHN0b3AtY29sb3I9IiMzNzQxNTEiLz48L2xpbmVhckdyYWRpZW50PjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2EpIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiIgZm9udC1zaXplPSIyOCIgZmlsbD0iI2ZmZmZmZiIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPuS4reWbveaVsOaNriDmr4vlhpLmnpDkurrpq5jkvJrph4fooYwgPC90ZXh0Pjwvc3ZnPg==",
    category: "经济",
    time: "2小时前",
    isMain: true,
    isFeatured: true
  },
  {
    id: 2,
    title: "AI芯片技术实现重大突破，中国企业发布新一代处理器",
    subtitle: "该处理器性能较上一代提升300%，将在自动驾驶和数据中心领域广泛应用",
    image: "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjI1MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZGVmcz48bGluZWFyR3JhZGllbnQgaWQ9ImIiIHgxPSIwJSIgeTE9IjAlIiB4Mj0iMTAwJSIgeTI9IjEwMCUiPjxzdG9wIG9mZnNldD0iMCUiIHN0b3AtY29sb3I9IiMzYjgyZjYiLz48c3RvcCBvZmZzZXQ9IjEwMCUiIHN0b3AtY29sb3I9IiM2MzY2ZjEiLz48L2xpbmVhckdyYWRpZW50PjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2IpIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiIgZm9udC1zaXplPSIyNCIgZmlsbD0iI2ZmZmZmZiIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPkFJ6Iqv54mH5oqA5pyv5Lit5Zu95LyB5Lia5Y+R5biD5paw5LiA5Luj5aSE55CG5ZmoPC90ZXh0Pjwvc3ZnPg==",
    category: "科技",
    time: "3小时前",
    isMain: false,
    isFeatured: true
  },
  {
    id: 3,
    title: "全球气候峰会达成减排新协议，194国承诺2030年减排50%",
    subtitle: "这是自《巴黎协定》以来最具雄心的全球气候行动计划",
    image: "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjI1MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZGVmcz48bGluZWFyR3JhZGllbnQgaWQ9ImMiIHgxPSIwJSIgeTE9IjAlIiB4Mj0iMTAwJSIgeTI9IjEwMCUiPjxzdG9wIG9mZnNldD0iMCUiIHN0b3AtY29sb3I9IiMxMGI5ODEiLz48c3RvcCBvZmZzZXQ9IjEwMCUiIHN0b3AtY29sb3I9IiMwNTk2NjkiLz48L2xpbmVhckdyYWRpZW50PjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2MpIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiIgZm9udC1zaXplPSIyNCIgZmlsbD0iI2ZmZmZmZiIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPuWFqOeQg+awlOWAmeWzsOS8muWHj+aOkuaWsOWNj+iurTwvdGV4dD48L3N2Zz4=",
    category: "国际",
    time: "4小时前",
    isMain: false,
    isFeatured: true
  }
];

const topStories = [
  {
    id: 2,
    title: "人工智能监管新规即将出台，科技巨头面临合规挑战",
    summary: "欧盟《人工智能法案》将于明年生效，要求AI系统进行风险评估和透明度报告",
    image: "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZGVmcz48bGluZWFyR3JhZGllbnQgaWQ9ImQiIHgxPSIwJSIgeTE9IjAlIiB4Mj0iMTAwJSIgeTI9IjEwMCUiPjxzdG9wIG9mZnNldD0iMCUiIHN0b3AtY29sb3I9IiMzYjgyZjYiLz48c3RvcCBvZmZzZXQ9IjEwMCUiIHN0b3AtY29sb3I9IiM2MzY2ZjEiLz48L2xpbmVhckdyYWRpZW50PjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2QpIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiIgZm9udC1zaXplPSIyMCIgZmlsbD0iI2ZmZmZmZiIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPkFJ55uR566hIDogICAgPC90ZXh0Pjwvc3ZnPg==",
    category: "科技",
    time: "4小时前",
    isUrgent: true
  },
  {
    id: 3,
    title: "新型冠状病毒变异株XBB.1.16在全球传播，WHO呼吁加强监测",
    summary: "世界卫生组织表示新变异株传播性更强，但重症率未见显著增加",
    image: "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZGVmcz48bGluZWFyR3JhZGllbnQgaWQ9ImUiIHgxPSIwJSIgeTE9IjAlIiB4Mj0iMTAwJSIgeTI9IjEwMCUiPjxzdG9wIG9mZnNldD0iMCUiIHN0b3AtY29sb3I9IiNlZjQ0NDQiLz48c3RvcCBvZmZzZXQ9IjEwMCUiIHN0b3AtY29sb3I9IiNkYzI2MjYiLz48L2xpbmVhckdyYWRpZW50PjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2UpIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiIgZm9udC1zaXplPSIyMCIgZmlsbD0iI2ZmZmZmZiIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPkNPVklE6ISa54q54YmU5oyb5LmLIDo6OjogPC90ZXh0Pjwvc3ZnPg==",
    category: "健康",
    time: "6小时前",
    isUrgent: false
  },
  {
    id: 4,
    title: "俄乌冲突进入第600天，联合国呼吁各方重启和平谈判",
    summary: "联合国秘书长古特雷斯发表声明，敦促冲突各方通过外交途径解决争端",
    image: "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZGVmcz48bGluZWFyR3JhZGllbnQgaWQ9ImYiIHgxPSIwJSIgeTE9IjAlIiB4Mj0iMTAwJSIgeTI9IjEwMCUiPjxzdG9wIG9mZnNldD0iMCUiIHN0b3AtY29sb3I9IiNmNTllMGIiLz48c3RvcCBvZmZzZXQ9IjEwMCUiIHN0b3AtY29sb3I9IiNkOTc3MDYiLz48L2xpbmVhckdyYWRpZW50PjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2YpIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiIgZm9udC1zaXplPSIyMCIgZmlsbD0iI2ZmZmZmZiIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPuS+hOS5jOWGsuçqgSA6OiA8L3RleHQ+PC9zdmc+",
    category: "国际",
    time: "8小时前",
    isUrgent: false
  }
];

const sectionNews = {
  china: [
    {
      id: 5,
      title: "北京大兴国际机场三期扩建工程启动，预计2028年完工",
      summary: "扩建后年旅客吞吐量将达到1.3亿人次，成为世界最大航空枢纽之一",
      time: "3小时前",
      category: "国内"
    },
    {
      id: 6,
      title: "全国碳市场累计成交额突破100亿元，减排效果显著",
      summary: "自启动以来，全国碳排放权交易市场已覆盖45亿吨二氧化碳排放量",
      time: "5小时前",
      category: "环境"
    },
    {
      id: 7,
      title: "教育部：将人工智能课程纳入中小学必修课程",
      summary: "新课程标准将于2024年秋季学期开始实施，培养学生数字素养",
      time: "7小时前",
      category: "教育"
    }
  ],
  world: [
    {
      id: 8,
      title: "美联储维持基准利率不变，释放鸽派信号",
      summary: "联邦公开市场委员会认为当前利率水平有助于实现通胀目标",
      time: "12小时前",
      category: "国际"
    },
    {
      id: 9,
      title: "印度成功发射月球探测器，计划在月球南极着陆",
      summary: "这是印度第三次月球探测任务，预计月底到达月球轨道",
      time: "14小时前",
      category: "科技"
    },
    {
      id: 10,
      title: "欧洲议会通过新的数字服务法案，加强网络平台监管",
      summary: "新法案要求大型网络平台采取更严格措施打击虚假信息",
      time: "16小时前",
      category: "国际"
    }
  ],
  business: [
    {
      id: 11,
      title: "比亚迪第三季度营收破千亿，新能源车销量全球第一",
      summary: "公司前三季度累计销量207万辆，同比增长67.1%",
      time: "2小时前",
      category: "商业"
    },
    {
      id: 12,
      title: "中概股集体上涨，阿里巴巴涨幅超8%领跑科技股",
      summary: "受中国经济数据向好影响，在美上市中概股普遍收涨",
      time: "18小时前",
      category: "股市"
    }
  ]
};


const liveUpdates = [
  { time: "16:45", content: "上证指数收盘上涨1.2%，创近期新高", type: "market" },
  { time: "16:30", content: "外交部：中美高级别对话取得积极成果", type: "politics" },
  { time: "16:15", content: "国家统计局：9月CPI同比持平，PPI降幅收窄", type: "economy" },
  { time: "16:00", content: "华为Mate 60系列全球发布，搭载自研5G芯片", type: "tech" },
  { time: "15:45", content: "北京时间今晚将有流星雨出现，观测条件良好", type: "science" }
];

const mostRead = [
  { id: 1, title: "马斯克宣布X平台重大改革计划", reads: "126.8k" },
  { id: 2, title: "中国空间站完成最新科学实验", reads: "98.5k" },
  { id: 3, title: "全球通胀数据显示经济复苏迹象", reads: "87.2k" },
  { id: 4, title: "气候变化对农业生产的深远影响", reads: "76.9k" },
  { id: 5, title: "新一代互联网技术发展趋势", reads: "65.4k" }
];

const marketData = [
  { name: "上证指数", value: "3,247.26", change: "+1.2%", trend: "up" },
  { name: "深证成指", value: "10,486.59", change: "+0.8%", trend: "up" },
  { name: "创业板指", value: "2,156.78", change: "-0.3%", trend: "down" },
  { name: "恒生指数", value: "17,945.12", change: "+2.1%", trend: "up" }
];

export default function BBCStyleNews() {
  const [activeSection, setActiveSection] = React.useState("china");
  const [searchOpen, setSearchOpen] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [searchResults, setSearchResults] = React.useState<any[]>([]);
  const [searchHistory, setSearchHistory] = React.useState<string[]>([
    "人工智能监管", "气候变化协议", "经济增长数据", "体育赛事", "科技创新"
  ]);
  
  // 模拟搜索建议数据
  const searchSuggestions = [
    "人工智能", "气候变化", "经济政策", "科技创新", "体育新闻", "国际关系",
    "健康医疗", "教育改革", "环保政策", "金融市场", "文化艺术", "社会民生"
  ];
  
  // 模拟实时搜索结果
  const mockSearchResults = [
    { id: 1, title: "AI监管新政策出台，科技行业迎来重大变革", category: "科技", time: "2小时前", type: "article" },
    { id: 2, title: "全球气候峰会取得突破性进展", category: "国际", time: "4小时前", type: "article" },
    { id: 3, title: "专家解读经济数据：增长势头强劲", category: "财经", time: "6小时前", type: "video" },
    { id: 4, title: "科技创新推动产业升级", category: "科技", time: "8小时前", type: "article" },
  ];
  
  // 视频新闻数据
  const videoNews = [
    {
      id: 1,
      title: "【直播回放】全球气候峰会闭幕式完整版",
      description: "COP28联合国气候变化大会在迪拜圆满闭幕，达成历史性《阿联酋共识》，194个国家承诺转型脱离化石燃料",
      thumbnail: "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDgwIiBoZWlnaHQ9IjI3MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZGVmcz48bGluZWFyR3JhZGllbnQgaWQ9InZpZGVvMSIgeDE9IjAlIiB5MT0iMCUiIHgyPSIxMDAlIiB5Mj0iMTAwJSI+PHN0b3Agb2Zmc2V0PSIwJSIgc3RvcC1jb2xvcj0iIzFmMjkzNyIvPjxzdG9wIG9mZnNldD0iMTAwJSIgc3RvcC1jb2xvcj0iIzEwYjk4MSIvPjwvbGluZWFyR3JhZGllbnQ+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjdmlkZW8xKSIvPjx0ZXh0IHg9IjUwJSIgeT0iNDAlIiBmb250LWZhbWlseT0iQXJpYWwsIHNhbnMtc2VyaWYiIGZvbnQtc2l6ZT0iMjQiIGZpbGw9IiNmZmZmZmYiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj7msJTlgJnls7DkvJrnm7TmkK08L3RleHQ+PGNpcmNsZSBjeD0iNTAlIiBjeT0iNjAlIiByPSIzMCIgZmlsbD0icmdiYSgyNTUsMjU1LDI1NSwwLjEpIi8+PHBvbHlnb24gcG9pbnRzPSI0NTAsNzAgNDgwLDkwIDQ1MCwxMTAiIGZpbGw9IiNmZmZmZmYiLz48L3N2Zz4=",
      duration: "01:45:32",
      views: "125K",
      category: "国际",
      time: "2小时前",
      isLive: false,
      tags: ["气候变化", "联合国", "环保"]
    },
    {
      id: 2,
      title: "【独家专访】AI专家解读人工智能发展趋势",
      description: "对话清华大学AI研究院院长，深度解析2024年人工智能技术发展方向和监管政策影响",
      thumbnail: "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDgwIiBoZWlnaHQ9IjI3MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZGVmcz48bGluZWFyR3JhZGllbnQgaWQ9InZpZGVvMiIgeDE9IjAlIiB5MT0iMCUiIHgyPSIxMDAlIiB5Mj0iMTAwJSI+PHN0b3Agb2Zmc2V0PSIwJSIgc3RvcC1jb2xvcj0iIzNiODJmNiIvPjxzdG9wIG9mZnNldD0iMTAwJSIgc3RvcC1jb2xvcj0iIzYzNjZmMSIvPjwvbGluZWFyR3JhZGllbnQ+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjdmlkZW8yKSIvPjx0ZXh0IHg9IjUwJSIgeT0iNDAlIiBmb250LWZhbWlseT0iQXJpYWwsIHNhbnMtc2VyaWYiIGZvbnQtc2l6ZT0iMjQiIGZpbGw9IiNmZmZmZmYiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5BSeS4k+WutuijnOiuvzwvdGV4dD48Y2lyY2xlIGN4PSI1MCUiIGN5PSI2MCUiIHI9IjMwIiBmaWxsPSJyZ2JhKDI1NSwyNTUsMjU1LDAuMSkiLz48cG9seWdvbiBwb2ludHM9IjQ1MCw3MCA0ODAsOTAgNDUwLDExMCIgZmlsbD0iI2ZmZmZmZiIvPjwvc3ZnPg==",
      duration: "28:15",
      views: "89K",
      category: "科技",
      time: "5小时前",
      isLive: false,
      tags: ["人工智能", "科技", "专访"]
    },
    {
      id: 3,
      title: "🔴 【正在直播】股市实时解读 - 收盘分析",
      description: "财经专家实时解读今日A股行情，分析三大指数走势，为投资者提供专业建议",
      thumbnail: "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDgwIiBoZWlnaHQ9IjI3MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZGVmcz48bGluZWFyR3JhZGllbnQgaWQ9InZpZGVvMyIgeDE9IjAlIiB5MT0iMCUiIHgyPSIxMDAlIiB5Mj0iMTAwJSI+PHN0b3Agb2Zmc2V0PSIwJSIgc3RvcC1jb2xvcj0iI2VmNDQ0NCIvPjxzdG9wIG9mZnNldD0iMTAwJSIgc3RvcC1jb2xvcj0iI2Y5NzMxNiIvPjwvbGluZWFyR3JhZGllbnQ+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjdmlkZW8zKSIvPjx0ZXh0IHg9IjUwJSIgeT0iNDAlIiBmb250LWZhbWlseT0iQXJpYWwsIHNhbnMtc2VyaWYiIGZvbnQtc2l6ZT0iMjQiIGZpbGw9IiNmZmZmZmYiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj7oga/luILlrp7ml7booqPor7w8L3RleHQ+PGNpcmNsZSBjeD0iNTAlIiBjeT0iNjAlIiByPSIzMCIgZmlsbD0icmdiYSgyNTUsMjU1LDI1NSwwLjEpIi8+PHBvbHlnb24gcG9pbnRzPSI0NTAsNzAgNDgwLDkwIDQ1MCwxMTAiIGZpbGw9IiNmZmZmZmYiLz48L3N2Zz4=",
      duration: "LIVE",
      views: "2.3K",
      category: "财经",
      time: "正在直播",
      isLive: true,
      tags: ["股市", "投资", "财经"]
    }
  ];
  
  // 视频播放器状态
  const [currentVideo, setCurrentVideo] = React.useState<any>(null);
  const [videoPlayerOpen, setVideoPlayerOpen] = React.useState(false);
  
  // 评论系统状态
  const [commentsOpen, setCommentsOpen] = React.useState(false);
  const [currentArticle, setCurrentArticle] = React.useState<any>(null);
  const [userComment, setUserComment] = React.useState("");
  
  // 模拟评论数据
  const mockComments = [
    {
      id: 1,
      author: "经济分析师",
      avatar: "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMjAiIGN5PSIyMCIgcj0iMjAiIGZpbGw9IiMzYjgyZjYiLz4KPHN2ZyB4PSI4IiB5PSI4IiB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSI+CjxwYXRoIGQ9Ik0xNiA3QTQgNCAwIDExOCA3QTQgNCAwIDAxMTYgN1pNMTIgMTRBNyA3IDAgMDA1IDIxSDEzQTcgNyAwIDAwMTIgMTRaIiBzdHJva2U9IndoaXRlIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIvPgo8L3N2Zz4KPC9zdmc+",
      content: "这个分析很到位，特别是对宏观经济走势的判断。建议关注后续政策动向。",
      time: "5分钟前",
      likes: 12,
      replies: 3,
      isVerified: true
    },
    {
      id: 2,
      author: "投资小白",
      avatar: "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMjAiIGN5PSIyMCIgcj0iMjAiIGZpbGw9IiMxMGI5ODEiLz4KPHN2ZyB4PSI4IiB5PSI4IiB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSI+CjxwYXRoIGQ9Ik0xNiA3QTQgNCAwIDExOCA3QTQgNCAwIDAxMTYgN1pNMTIgMTRBNyA3IDAgMDA1IDIxSDEzQTcgNyAwIDAwMTIgMTRaIiBzdHJva2U9IndoaXRlIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIvPgo8L3N2Zz4KPC9zdmc+",
      content: "请问专家，对于普通投资者来说，现在是好的入市时机吗？有什么建议？",
      time: "8分钟前",
      likes: 5,
      replies: 1,
      isVerified: false
    },
    {
      id: 3,
      author: "财经记者王明",
      avatar: "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMjAiIGN5PSIyMCIgcj0iMjAiIGZpbGw9IiNlZjQ0NDQiLz4KPHN2ZyB4PSI4IiB5PSI4IiB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSI+CjxwYXRoIGQ9Ik0xNiA3QTQgNCAwIDExOCA3QTQgNCAwIDAxMTYgN1pNMTIgMTRBNyA3IDAgMDA1IDIxSDEzQTcgNyAwIDAwMTIgMTRaIiBzdHJva2U9IndoaXRlIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIvPgo8L3N2Zz4KPC9zdmc+",
      content: "感谢分享！这篇报道的数据来源很权威，已收藏作为参考资料。期待后续深度报道。",
      time: "12分钟前",
      likes: 8,
      replies: 0,
      isVerified: true
    }
  ];
  
  // 用户互动功能
  const [userLikes, setUserLikes] = React.useState<Set<number>>(new Set());
  const [userBookmarks, setUserBookmarks] = React.useState<Set<number>>(new Set());
  
  const toggleLike = (articleId: number) => {
    setUserLikes(prev => {
      const newLikes = new Set(prev);
      if (newLikes.has(articleId)) {
        newLikes.delete(articleId);
      } else {
        newLikes.add(articleId);
      }
      return newLikes;
    });
  };
  
  const toggleBookmark = (articleId: number) => {
    setUserBookmarks(prev => {
      const newBookmarks = new Set(prev);
      if (newBookmarks.has(articleId)) {
        newBookmarks.delete(articleId);
      } else {
        newBookmarks.add(articleId);
      }
      return newBookmarks;
    });
  };
  
  // 搜索功能
  const handleSearch = (query: string) => {
    if (query.trim()) {
      const filtered = mockSearchResults.filter(item => 
        item.title.toLowerCase().includes(query.toLowerCase()) ||
        item.category.toLowerCase().includes(query.toLowerCase())
      );
      setSearchResults(filtered);
      
      // 添加到搜索历史
      if (!searchHistory.includes(query)) {
        setSearchHistory(prev => [query, ...prev.slice(0, 4)]);
      }
    } else {
      setSearchResults([]);
    }
  };
  
  // 自动完成搜索
  const getSearchSuggestions = (query: string) => {
    if (!query) return [];
    return searchSuggestions.filter(suggestion => 
      suggestion.toLowerCase().includes(query.toLowerCase())
    ).slice(0, 5);
  };

  return (
    <>
      {/* 关键CSS动画和样式优化 */}
      <style jsx global>{`
        @keyframes marquee {
          0% { transform: translateX(100%); }
          100% { transform: translateX(-100%); }
        }
        
        .animate-marquee {
          animation: marquee 30s linear infinite;
        }
        
        @keyframes slideInFromTop {
          from {
            opacity: 0;
            transform: translateY(-20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        .animate-slideInFromTop {
          animation: slideInFromTop 0.6s ease-out;
        }
        
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        .animate-fadeInUp {
          animation: fadeInUp 0.8s ease-out;
        }
        
        /* 优化的滚动条 */
        ::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }
        
        ::-webkit-scrollbar-track {
          background: #f8f9fa;
          border-radius: 4px;
        }
        
        ::-webkit-scrollbar-thumb {
          background: linear-gradient(45deg, #dc2626, #ef4444);
          border-radius: 4px;
        }
        
        ::-webkit-scrollbar-thumb:hover {
          background: linear-gradient(45deg, #b91c1c, #dc2626);
        }
        
        /* 平滑滚动 */
        html {
          scroll-behavior: smooth;
        }
        
        /* 新闻卡片悬停效果 */
        .news-card {
          transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
        }
        
        .news-card:hover {
          transform: translateY(-4px) scale(1.02);
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.15);
        }
        
        /* 加载动画 */
        @keyframes shimmer {
          0% { background-position: -200px 0; }
          100% { background-position: calc(200px + 100%) 0; }
        }
        
        .animate-shimmer {
          background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
          background-size: 200px 100%;
          animation: shimmer 1.5s infinite;
        }
        
        /* 文字渐变效果 */
        .text-gradient {
          background: linear-gradient(45deg, #dc2626, #ef4444, #f97316);
          background-size: 200% 200%;
          background-clip: text;
          -webkit-background-clip: text;
          color: transparent;
          animation: gradient-shift 3s ease infinite;
        }
        
        @keyframes gradient-shift {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
        
        /* 响应式字体优化 */
        @media (max-width: 640px) {
          .text-responsive-headline {
            font-size: 1.5rem;
            line-height: 1.4;
          }
        }
        
        @media (min-width: 1024px) {
          .text-responsive-headline {
            font-size: 3rem;
            line-height: 1.2;
          }
        }
        
        /* 高对比度模式支持 */
        @media (prefers-contrast: high) {
          .text-gray-600 {
            color: #374151 !important;
          }
          
          .border-gray-200 {
            border-color: #6b7280 !important;
          }
        }
        
        /* 减少动画模式支持 */
        @media (prefers-reduced-motion: reduce) {
          * {
            animation-duration: 0.01ms !important;
            animation-iteration-count: 1 !important;
            transition-duration: 0.01ms !important;
          }
        }
        
        /* 打印样式优化 */
        @media print {
          .no-print {
            display: none !important;
          }
          
          body {
            background: white !important;
            color: black !important;
          }
        }
      `}</style>
      
    <div className="min-h-screen bg-white">
      {/* BBC风格的突发新闻条 */}
      {breakingNews.isBreaking && (
        <div className="bg-red-600 text-white py-2">
          <div className="max-w-7xl mx-auto px-4">
            <div className="flex items-center">
              <span className="bg-white text-red-600 px-3 py-1 text-xs font-bold mr-4 rounded">
                突发新闻
              </span>
              <div className="flex-1">
                <span className="font-semibold">{breakingNews.title}</span>
                <span className="ml-4 text-sm opacity-90">{breakingNews.time}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 突发新闻条 - 大型新闻网站必备 */}
      <div className="bg-red-600 text-white overflow-hidden">
        <div className="py-1 px-4">
          <div className="flex items-center">
            <span className="bg-white text-red-600 px-2 py-0.5 text-xs font-bold rounded mr-3 flex-shrink-0">
              突发
            </span>
            <div className="animate-marquee whitespace-nowrap text-sm">
              <span className="mr-8">🔴 联合国气候峰会达成历史性减排协议，194国承诺2030年减排50%</span>
              <span className="mr-8">📈 美联储维持基准利率不变，释放鸽派信号推动全球股市上涨</span>
              <span className="mr-8">🏀 NBA总决赛今晚开赛，勇士vs凯尔特人巅峰对决</span>
              <span className="mr-8">🚀 中国空间站完成在轨关键技术验证，为深空探测奠定基础</span>
            </div>
          </div>
        </div>
      </div>

      {/* BBC风格导航栏 - 增强版 */}
      <header className="bg-black text-white sticky top-0 z-40 shadow-lg">
        <div className="max-w-7xl mx-auto px-4">
          {/* 顶部品牌栏 */}
          <div className="flex items-center justify-between py-3 border-b border-gray-700">
            <div className="flex items-center space-x-6">
              <Link href="/portal/demo" className="text-gray-300 hover:text-white text-sm transition-colors">
                ← Demo 首页
              </Link>
              
              {/* 增强的Logo */}
              <div className="text-2xl font-bold">
                <span className="bg-white text-black px-3 py-1.5 rounded font-black">新闻</span>
                <span className="ml-2 bg-red-600 text-white px-2 py-1 text-sm rounded">NEWS</span>
                <span className="ml-2 text-xs text-green-400 border border-green-400 px-1.5 py-0.5 rounded animate-pulse">LIVE</span>
              </div>
              
              {/* 实时信息 */}
              <div className="hidden md:flex items-center space-x-4 text-sm">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-green-400">实时</span>
                </div>
                <span>北京时间</span>
                <span className="font-mono bg-gray-800 px-2 py-1 rounded text-green-400">16:48:32</span>
                <span className="text-gray-500">|</span>
                <span>2024年10月18日</span>
                <span className="text-gray-500">|</span>
                <span className="text-blue-400">北京 晴 22°C</span>
              </div>
            </div>
            
            {/* 增强的工具栏 */}
            <div className="flex items-center space-x-2">
              {/* 语言切换 */}
              <div className="hidden lg:flex items-center space-x-2 text-xs">
                <button className="text-red-500 font-semibold px-2 py-1 rounded bg-red-500/10">中文</button>
                <button className="text-gray-400 hover:text-white px-2 py-1 rounded hover:bg-gray-800 transition-all">EN</button>
                <button className="text-gray-400 hover:text-white px-2 py-1 rounded hover:bg-gray-800 transition-all">日本語</button>
              </div>
              
              {/* 暗色模式切换 */}
              <button className="hover:text-gray-300 p-2 hover:bg-gray-800 rounded transition-all" title="暗色模式">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
              </button>
              
              {/* 字体大小 */}
              <button className="hover:text-gray-300 p-2 hover:bg-gray-800 rounded transition-all text-xs" title="字体大小">
                <span className="font-bold">A</span>
              </button>
              
              {/* 智能搜索 */}
              <button 
                onClick={() => setSearchOpen(true)}
                className="hover:text-gray-300 p-2 hover:bg-gray-800 rounded transition-all relative" 
                title="智能搜索"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                {searchQuery && (
                  <span className="absolute -top-1 -right-1 w-2 h-2 bg-blue-500 rounded-full"></span>
                )}
              </button>
              
              {/* 通知 */}
              <button className="hover:text-gray-300 p-2 hover:bg-gray-800 rounded transition-all relative" title="通知">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5v-5z" />
                </svg>
                <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full"></span>
              </button>
              
              {/* 用户 */}
              <button className="hover:text-gray-300 p-2 hover:bg-gray-800 rounded transition-all" title="用户中心">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </button>
            </div>
          </div>
          
          {/* 增强的主导航 */}
          <nav className="py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-8 text-sm">
                <a href="#" className="text-red-500 font-semibold border-b-2 border-red-500 pb-2 transition-all">首页</a>
                <a href="#" className="hover:text-gray-300 pb-2 transition-all relative group">
                  中国
                  <span className="absolute -bottom-0.5 left-0 w-0 h-0.5 bg-red-500 transition-all group-hover:w-full"></span>
                </a>
                <a href="#" className="hover:text-gray-300 pb-2 transition-all relative group">
                  国际
                  <span className="absolute -bottom-0.5 left-0 w-0 h-0.5 bg-red-500 transition-all group-hover:w-full"></span>
                </a>
                <a href="#" className="hover:text-gray-300 pb-2 transition-all relative group">
                  商业
                  <span className="absolute -bottom-0.5 left-0 w-0 h-0.5 bg-red-500 transition-all group-hover:w-full"></span>
                </a>
                <a href="#" className="hover:text-gray-300 pb-2 transition-all relative group">
                  科技
                  <span className="absolute -bottom-0.5 left-0 w-0 h-0.5 bg-red-500 transition-all group-hover:w-full"></span>
                </a>
                <a href="#" className="hover:text-gray-300 pb-2 transition-all relative group">
                  体育
                  <span className="absolute -bottom-0.5 left-0 w-0 h-0.5 bg-red-500 transition-all group-hover:w-full"></span>
                </a>
                <a href="#" className="hover:text-gray-300 pb-2 transition-all relative group">
                  文化
                  <span className="absolute -bottom-0.5 left-0 w-0 h-0.5 bg-red-500 transition-all group-hover:w-full"></span>
                </a>
                <a href="#" className="hover:text-gray-300 pb-2 transition-all relative group">
                  视频
                  <span className="absolute -bottom-0.5 left-0 w-0 h-0.5 bg-red-500 transition-all group-hover:w-full"></span>
                  <span className="ml-1 text-xs bg-red-600 text-white px-1 rounded">HD</span>
                </a>
              </div>
              
              {/* 股市指数滚动 */}
              <div className="hidden xl:flex items-center space-x-6 text-xs bg-gray-800 px-4 py-2 rounded">
                <div className="flex items-center space-x-2">
                  <span className="text-gray-400">上证</span>
                  <span className="text-green-400 font-mono">3247.28</span>
                  <span className="text-green-400">+1.2%</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-gray-400">深证</span>
                  <span className="text-red-400 font-mono">10928.45</span>
                  <span className="text-red-400">-0.8%</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-gray-400">创业板</span>
                  <span className="text-green-400 font-mono">2156.78</span>
                  <span className="text-green-400">+2.1%</span>
                </div>
              </div>
            </div>
          </nav>
        </div>
      </header>

      {/* 智能搜索弹窗 */}
      {searchOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-start justify-center pt-20">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl mx-4 max-h-[80vh] overflow-hidden animate-slideInFromTop">
            {/* 搜索头部 */}
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center space-x-4">
                <div className="flex-1 relative">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      handleSearch(e.target.value);
                    }}
                    placeholder="搜索新闻、视频、专题..."
                    className="w-full px-4 py-3 pl-12 pr-16 text-lg border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    autoFocus
                  />
                  <svg className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  {searchQuery && (
                    <button
                      onClick={() => {
                        setSearchQuery("");
                        setSearchResults([]);
                      }}
                      className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>
                
                {/* 高级搜索和关闭按钮 */}
                <button className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg hover:bg-gray-50 transition-all">
                  高级搜索
                </button>
                <button
                  onClick={() => setSearchOpen(false)}
                  className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-all"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              {/* 快速筛选器 */}
              <div className="flex flex-wrap gap-2 mt-4">
                {["全部", "文章", "视频", "专题", "图片"].map((filter, index) => (
                  <button
                    key={filter}
                    className={`px-3 py-1 text-sm rounded-full transition-all ${
                      index === 0 
                        ? "bg-red-100 text-red-600 border border-red-200" 
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}
                  >
                    {filter}
                  </button>
                ))}
              </div>
            </div>

            {/* 搜索内容区域 */}
            <div className="flex h-96">
              {/* 左侧：建议和历史 */}
              <div className="w-1/3 p-6 border-r border-gray-200 bg-gray-50">
                {/* 搜索建议 */}
                {searchQuery && getSearchSuggestions(searchQuery).length > 0 && (
                  <div className="mb-6">
                    <h3 className="text-sm font-semibold text-gray-700 mb-3">搜索建议</h3>
                    <div className="space-y-2">
                      {getSearchSuggestions(searchQuery).map((suggestion, index) => (
                        <button
                          key={index}
                          onClick={() => {
                            setSearchQuery(suggestion);
                            handleSearch(suggestion);
                          }}
                          className="block w-full text-left px-3 py-2 text-sm text-gray-600 hover:bg-white hover:text-red-600 rounded-lg transition-all"
                        >
                          <div className="flex items-center">
                            <svg className="w-4 h-4 mr-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                            {suggestion}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* 搜索历史 */}
                {!searchQuery && searchHistory.length > 0 && (
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-sm font-semibold text-gray-700">最近搜索</h3>
                      <button 
                        onClick={() => setSearchHistory([])}
                        className="text-xs text-gray-500 hover:text-red-600"
                      >
                        清除
                      </button>
                    </div>
                    <div className="space-y-2">
                      {searchHistory.map((item, index) => (
                        <button
                          key={index}
                          onClick={() => {
                            setSearchQuery(item);
                            handleSearch(item);
                          }}
                          className="block w-full text-left px-3 py-2 text-sm text-gray-600 hover:bg-white hover:text-red-600 rounded-lg transition-all"
                        >
                          <div className="flex items-center">
                            <svg className="w-4 h-4 mr-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            {item}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* 热门搜索 */}
                {!searchQuery && (
                  <div className="mt-6">
                    <h3 className="text-sm font-semibold text-gray-700 mb-3">热门搜索</h3>
                    <div className="flex flex-wrap gap-2">
                      {["AI监管", "气候峰会", "经济数据", "科技创新"].map((tag, index) => (
                        <button
                          key={index}
                          onClick={() => {
                            setSearchQuery(tag);
                            handleSearch(tag);
                          }}
                          className="px-2 py-1 text-xs bg-white text-red-600 border border-red-200 rounded-full hover:bg-red-50 transition-all"
                        >
                          #{tag}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* 右侧：搜索结果 */}
              <div className="w-2/3 p-6 overflow-y-auto">
                {searchQuery && searchResults.length === 0 && (
                  <div className="text-center py-12">
                    <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <p className="text-gray-500">未找到相关结果</p>
                    <p className="text-sm text-gray-400 mt-2">尝试使用不同的关键词</p>
                  </div>
                )}

                {searchResults.length > 0 && (
                  <>
                    <div className="flex items-center justify-between mb-4">
                      <p className="text-sm text-gray-600">找到 {searchResults.length} 条相关结果</p>
                      <select className="text-sm border border-gray-300 rounded px-2 py-1">
                        <option>按相关性排序</option>
                        <option>按时间排序</option>
                        <option>按热度排序</option>
                      </select>
                    </div>
                    
                    <div className="space-y-4">
                      {searchResults.map((result) => (
                        <div key={result.id} className="p-4 border border-gray-200 rounded-lg hover:border-red-200 hover:shadow-md transition-all cursor-pointer">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center space-x-2 mb-2">
                                <span className={`px-2 py-1 text-xs rounded-full ${
                                  result.type === 'video' 
                                    ? 'bg-red-100 text-red-600' 
                                    : 'bg-blue-100 text-blue-600'
                                }`}>
                                  {result.type === 'video' ? '视频' : '文章'}
                                </span>
                                <span className="text-xs text-gray-500">{result.category}</span>
                                <span className="text-xs text-gray-400">{result.time}</span>
                              </div>
                              <h4 className="font-semibold text-gray-900 hover:text-red-600 mb-2">
                                {result.title}
                              </h4>
                              <p className="text-sm text-gray-600 line-clamp-2">
                                这是文章的摘要内容，展示文章的主要信息和关键点...
                              </p>
                            </div>
                            {result.type === 'video' && (
                              <div className="ml-4 w-16 h-12 bg-gray-200 rounded flex items-center justify-center">
                                <svg className="w-6 h-6 text-gray-400" fill="currentColor" viewBox="0 0 24 24">
                                  <path d="M8 5v14l11-7z"/>
                                </svg>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}

                {!searchQuery && (
                  <div className="text-center py-12">
                    <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <p className="text-gray-500">开始搜索新闻内容</p>
                    <p className="text-sm text-gray-400 mt-2">输入关键词搜索文章、视频、专题等内容</p>
                  </div>
                )}
              </div>
            </div>

            {/* 搜索底部 */}
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
              <div className="flex items-center justify-between text-xs text-gray-500">
                <div className="flex items-center space-x-4">
                  <span>快捷键：Ctrl + K</span>
                  <span>支持语音搜索</span>
                  <span>AI智能推荐</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span>Powered by</span>
                  <span className="font-semibold text-red-600">NewAI</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 主要内容区域 */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* 主内容区 (2/3) */}
          <div className="lg:col-span-2 space-y-10">
            {/* Hero 主要新闻 */}
            <section className="mb-10">
              <article className="relative group cursor-pointer">
                <div className="relative h-96 lg:h-[500px] rounded-xl overflow-hidden">
                  <img 
                    src={featuredStories[0].image} 
                    alt={featuredStories[0].title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"></div>
                  
                  {/* 内容覆盖层 */}
                  <div className="absolute bottom-0 left-0 right-0 p-8 lg:p-12">
                    <div className="mb-4">
                      <span className="bg-red-600 text-white px-4 py-2 text-sm font-bold rounded-lg">
                        {featuredStories[0].category}
                      </span>
                    </div>
                    <h1 className="text-3xl lg:text-5xl font-bold text-white mb-4 leading-tight">
                      {featuredStories[0].title}
                    </h1>
                    <p className="text-xl lg:text-2xl text-gray-200 mb-6 leading-relaxed max-w-4xl">
                      {featuredStories[0].subtitle}
                    </p>
                    <div className="flex items-center justify-between text-gray-300">
                      <div className="flex items-center">
                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span className="text-lg">{featuredStories[0].time}</span>
                      </div>
                      
                      {/* 互动功能按钮 */}
                      <div className="flex items-center space-x-4">
                        {/* 点赞 */}
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleLike(featuredStories[0].id);
                          }}
                          className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-all ${
                            userLikes.has(featuredStories[0].id) 
                              ? 'bg-red-600 text-white' 
                              : 'bg-black/50 text-gray-300 hover:bg-red-600 hover:text-white'
                          }`}
                        >
                          <svg className="w-5 h-5" fill={userLikes.has(featuredStories[0].id) ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                          </svg>
                          <span>
                            {userLikes.has(featuredStories[0].id) ? "已赞" : "点赞"}
                          </span>
                        </button>
                        
                        {/* 评论 */}
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            setCurrentArticle(featuredStories[0]);
                            setCommentsOpen(true);
                          }}
                          className="flex items-center space-x-2 px-4 py-2 bg-black/50 text-gray-300 rounded-lg hover:bg-blue-600 hover:text-white transition-all"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                          </svg>
                          <span>评论</span>
                        </button>
                        
                        {/* 收藏 */}
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleBookmark(featuredStories[0].id);
                          }}
                          className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-all ${
                            userBookmarks.has(featuredStories[0].id) 
                              ? 'bg-yellow-600 text-white' 
                              : 'bg-black/50 text-gray-300 hover:bg-yellow-600 hover:text-white'
                          }`}
                        >
                          <svg className="w-5 h-5" fill={userBookmarks.has(featuredStories[0].id) ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                          </svg>
                          <span>
                            {userBookmarks.has(featuredStories[0].id) ? "已收藏" : "收藏"}
                          </span>
                        </button>
                        
                        {/* 分享 */}
                        <button className="flex items-center space-x-2 px-4 py-2 bg-black/50 text-gray-300 rounded-lg hover:bg-green-600 hover:text-white transition-all">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
                          </svg>
                          <span>分享</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </article>
            </section>

            {/* 即时新闻 */}
            <section>
              <h2 className="text-3xl font-bold text-gray-900 mb-8 border-b-4 border-red-600 pb-3">
                即时新闻
              </h2>
              
              <div className="grid grid-cols-1 gap-6">
                {topStories.map((story, index) => (
                  <article key={story.id} className={`group cursor-pointer ${
                    index < topStories.length - 1 ? 'border-b border-gray-200 pb-6' : ''
                  }`}>
                    <div className="flex gap-6">
                      <div className="w-2/5 lg:w-1/3">
                        <div className="relative overflow-hidden rounded-lg">
                          <img 
                            src={story.image} 
                            alt={story.title}
                            className="w-full h-40 object-cover group-hover:scale-105 transition-transform duration-500"
                          />
                          <div className="absolute top-3 left-3">
                            <span className="bg-red-600 text-white px-2 py-1 text-xs font-semibold rounded">
                              {story.category}
                            </span>
                          </div>
                          {story.isUrgent && (
                            <div className="absolute top-3 right-3">
                              <span className="bg-red-500 text-white px-2 py-1 text-xs font-bold rounded animate-pulse">
                                紧急
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="w-3/5 lg:w-2/3 flex flex-col justify-center">
                        <h3 className="text-2xl font-bold text-gray-900 mb-3 hover:text-red-600 transition-colors leading-tight">
                          {story.title}
                        </h3>
                        <p className="text-lg text-gray-600 mb-4 leading-relaxed">
                          {story.summary}
                        </p>
                        <div className="flex items-center text-sm text-gray-500">
                          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span className="text-base">{story.time}</span>
                        </div>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </section>

            {/* 今日要闻 */}
            <section>
              <h2 className="text-3xl font-bold text-gray-900 mb-8 border-b-4 border-red-600 pb-3">
                今日要闻
              </h2>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {featuredStories.slice(1).map((story) => (
                  <article key={story.id} className="group cursor-pointer">
                    <div className="relative mb-4 overflow-hidden rounded-lg">
                      <img 
                        src={story.image} 
                        alt={story.title}
                        className="w-full h-64 object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                      <div className="absolute top-4 left-4">
                        <span className="bg-red-600 text-white px-3 py-1 text-sm font-semibold rounded">
                          {story.category}
                        </span>
                      </div>
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-3 hover:text-red-600 transition-colors leading-tight">
                      {story.title}
                    </h2>
                    <p className="text-lg text-gray-600 mb-3 leading-relaxed">
                      {story.subtitle}
                    </p>
                    <div className="flex items-center text-sm text-gray-500">
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span>{story.time}</span>
                    </div>
                  </article>
                ))}
              </div>
            </section>

            {/* 四层信息架构演示 */}
            <section className="bg-gradient-to-r from-blue-50 to-indigo-50 p-8 rounded-xl mb-12">
              <h2 className="text-3xl font-bold text-gray-900 mb-6 text-center">
                📊 专业新闻网站四层信息架构演示
              </h2>
              
              <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-8">
                {/* 1. Channel 频道 */}
                <div className="bg-blue-100 p-6 rounded-lg border-2 border-blue-300">
                  <h3 className="font-bold text-blue-800 mb-3 text-center">🏢 Channel (频道)</h3>
                  <div className="text-xs text-blue-700 space-y-2">
                    <div><strong>定义：</strong>一级导航骨架</div>
                    <div><strong>URL：</strong>/channel/politics/</div>
                    <div><strong>特点：</strong>相对稳定，独立模板</div>
                    <div><strong>示例：</strong></div>
                    <ul className="ml-2 space-y-1">
                      <li>• 时政</li>
                      <li>• 财经</li>
                      <li>• 科技</li>
                      <li>• 体育</li>
                    </ul>
                  </div>
                </div>

                {/* 2. Category 分类 */}
                <div className="bg-green-100 p-6 rounded-lg border-2 border-green-300">
                  <h3 className="font-bold text-green-800 mb-3 text-center">📁 Category (分类)</h3>
                  <div className="text-xs text-green-700 space-y-2">
                    <div><strong>定义：</strong>结构化细分</div>
                    <div><strong>URL：</strong>/channel/politics/policy/</div>
                    <div><strong>特点：</strong>可跨频道，树状结构</div>
                    <div><strong>示例：</strong></div>
                    <ul className="ml-2 space-y-1">
                      <li>• 政策解读</li>
                      <li>• 地方政务</li>
                      <li>• 国际关系</li>
                      <li>• 法律法规</li>
                    </ul>
                  </div>
                </div>

                {/* 3. Tag 标签 */}
                <div className="bg-yellow-100 p-6 rounded-lg border-2 border-yellow-300">
                  <h3 className="font-bold text-yellow-800 mb-3 text-center">🏷️ Tag (标签)</h3>
                  <div className="text-xs text-yellow-700 space-y-2">
                    <div><strong>定义：</strong>轻量灵活标记</div>
                    <div><strong>URL：</strong>/tag/ai-regulation/</div>
                    <div><strong>特点：</strong>跨频道，热点追踪</div>
                    <div><strong>示例：</strong></div>
                    <ul className="ml-2 space-y-1">
                      <li>• AI监管</li>
                      <li>• 巴黎奥运</li>
                      <li>• 碳中和</li>
                      <li>• 数字货币</li>
                    </ul>
                  </div>
                </div>

                {/* 4. Topic 专题 */}
                <div className="bg-red-100 p-6 rounded-lg border-2 border-red-300">
                  <h3 className="font-bold text-red-800 mb-3 text-center">📋 Topic (专题)</h3>
                  <div className="text-xs text-red-700 space-y-2">
                    <div><strong>定义：</strong>项目化集合页</div>
                    <div><strong>URL：</strong>/topic/us-election-2024/</div>
                    <div><strong>特点：</strong>跨所有层级聚合</div>
                    <div><strong>示例：</strong></div>
                    <ul className="ml-2 space-y-1">
                      <li>• 美国大选2024</li>
                      <li>• COP28气候大会</li>
                      <li>• 春节返乡专题</li>
                      <li>• 世界杯报道</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-lg border border-gray-200">
                <h4 className="font-bold text-gray-800 mb-4">🔗 层级关系与数据流</h4>
                <div className="text-sm text-gray-600 space-y-2">
                  <div>📰 <strong>文章归属规则：</strong></div>
                  <ul className="ml-4 space-y-1">
                    <li>• 主归属：每篇文章只属于1个Channel</li>
                    <li>• 多分类：可关联多个Category（跨频道允许）</li>
                    <li>• 多标签：可打多个Tag</li>
                    <li>• 多专题：可被挂接到多个Topic</li>
                  </ul>
                  
                  <div className="mt-4">🎯 <strong>URL规范示例：</strong></div>
                  <div className="bg-gray-50 p-3 rounded font-mono text-xs">
                    <div>/channel/politics/                     # 频道页</div>
                    <div>/channel/politics/policy/              # 分类页</div>
                    <div>/topic/us-election-2024/              # 专题页</div>
                    <div>/channel/politics/2024/01/15/article/ # 文章页</div>
                  </div>
                </div>
              </div>
            </section>

            {/* Category 分类导航 - 符合架构的真正分类 */}
            <section>
              <h2 className="text-3xl font-bold text-gray-900 mb-8 border-b-4 border-green-600 pb-3">
                📁 新闻分类 (Category)
              </h2>
              
              <div className="bg-green-50 p-4 rounded-lg mb-8">
                <div className="text-sm text-green-800">
                  💡 这里展示的是<strong>频道内的结构化细分</strong>，符合专业新闻网站的Category层级
                </div>
              </div>
              
              <div className="border-b border-gray-200 mb-8">
                <div className="flex space-x-8">
                  <button
                    onClick={() => setActiveSection("china")}
                    className={`pb-4 text-lg font-bold transition-colors ${
                      activeSection === "china" 
                        ? "text-green-600 border-b-3 border-green-600" 
                        : "text-gray-600 hover:text-gray-900"
                    }`}
                  >
                    政策解读
                  </button>
                  <button
                    onClick={() => setActiveSection("world")}
                    className={`pb-4 text-lg font-bold transition-colors ${
                      activeSection === "world" 
                        ? "text-green-600 border-b-3 border-green-600" 
                        : "text-gray-600 hover:text-gray-900"
                    }`}
                  >
                    国际关系
                  </button>
                  <button
                    onClick={() => setActiveSection("business")}
                    className={`pb-4 text-lg font-bold transition-colors ${
                      activeSection === "business" 
                        ? "text-green-600 border-b-3 border-green-600" 
                        : "text-gray-600 hover:text-gray-900"
                    }`}
                  >
                    经济形势
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {sectionNews[activeSection as keyof typeof sectionNews]?.map((news, index) => (
                  <article key={news.id} className="group cursor-pointer border border-gray-100 rounded-lg p-6 hover:border-red-200 hover:shadow-lg transition-all duration-300">
                    <div className="flex items-center space-x-3 mb-3">
                      <span className="bg-red-600 text-white px-3 py-1 text-sm font-semibold rounded">
                        {news.category}
                      </span>
                      <span className="text-gray-500 text-sm">{news.time}</span>
                    </div>
                    <h4 className="text-xl font-bold text-gray-900 mb-3 group-hover:text-red-600 transition-colors leading-tight">
                      {news.title}
                    </h4>
                    <p className="text-gray-600 leading-relaxed">{news.summary}</p>
                  </article>
                ))}
              </div>
            </section>

            {/* Tag 标签系统 */}
            <section>
              <h2 className="text-3xl font-bold text-gray-900 mb-8 border-b-4 border-yellow-600 pb-3">
                🏷️ 热点标签 (Tag)
              </h2>
              
              <div className="bg-yellow-50 p-4 rounded-lg mb-8">
                <div className="text-sm text-yellow-800">
                  💡 这里展示<strong>跨频道的灵活标签</strong>，适合热点追踪和算法特征提取
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* 热门标签云 */}
                <div className="lg:col-span-2">
                  <h3 className="text-xl font-bold text-gray-800 mb-4">🔥 热门标签</h3>
                  <div className="flex flex-wrap gap-3">
                    {[
                      { name: "AI监管", count: 156, color: "bg-blue-100 text-blue-800 hover:bg-blue-200", url: "/tag/ai-regulation/" },
                      { name: "巴黎奥运", count: 89, color: "bg-green-100 text-green-800 hover:bg-green-200", url: "/tag/paris-olympics/" },
                      { name: "碳中和", count: 134, color: "bg-emerald-100 text-emerald-800 hover:bg-emerald-200", url: "/tag/carbon-neutral/" },
                      { name: "数字货币", count: 67, color: "bg-purple-100 text-purple-800 hover:bg-purple-200", url: "/tag/digital-currency/" },
                      { name: "芯片技术", count: 98, color: "bg-indigo-100 text-indigo-800 hover:bg-indigo-200", url: "/tag/chip-tech/" },
                      { name: "新能源", count: 112, color: "bg-lime-100 text-lime-800 hover:bg-lime-200", url: "/tag/new-energy/" },
                      { name: "太空探索", count: 45, color: "bg-cyan-100 text-cyan-800 hover:bg-cyan-200", url: "/tag/space-exploration/" },
                      { name: "生物技术", count: 76, color: "bg-rose-100 text-rose-800 hover:bg-rose-200", url: "/tag/biotech/" },
                      { name: "5G应用", count: 54, color: "bg-orange-100 text-orange-800 hover:bg-orange-200", url: "/tag/5g-apps/" },
                      { name: "元宇宙", count: 38, color: "bg-violet-100 text-violet-800 hover:bg-violet-200", url: "/tag/metaverse/" }
                    ].map((tag, index) => (
                      <span
                        key={index}
                        className={`px-4 py-2 rounded-full text-sm font-medium cursor-pointer transition-all duration-200 ${tag.color}`}
                        title={`${tag.count} 篇相关文章`}
                      >
                        {tag.name} ({tag.count})
                      </span>
                    ))}
                  </div>
                </div>

                {/* 标签统计 */}
                <div>
                  <h3 className="text-xl font-bold text-gray-800 mb-4">📊 标签统计</h3>
                  <div className="bg-white p-4 rounded-lg border border-gray-200">
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">总标签数</span>
                        <span className="font-bold text-yellow-600">1,247</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">活跃标签</span>
                        <span className="font-bold text-green-600">589</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">今日新增</span>
                        <span className="font-bold text-blue-600">12</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">跨频道标签</span>
                        <span className="font-bold text-purple-600">203</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Topic 专题系统 */}
            <section>
              <h2 className="text-3xl font-bold text-gray-900 mb-8 border-b-4 border-red-600 pb-3">
                📋 重大专题 (Topic)
              </h2>
              
              <div className="bg-red-50 p-4 rounded-lg mb-8">
                <div className="text-sm text-red-800">
                  💡 这里展示<strong>项目化集合页</strong>，跨频道/分类/标签聚合重大议题
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* 主要专题 */}
                {[
                  {
                    id: "us-election-2024",
                    title: "美国大选2024",
                    description: "2024年美国总统大选全程跟踪报道",
                    coverImage: "bg-gradient-to-br from-blue-600 to-red-600",
                    url: "/topic/us-election-2024/",
                    articles: 234,
                    channels: ["时政", "国际", "财经"],
                    tags: ["美国政治", "总统大选", "国际关系"],
                    lastUpdate: "2小时前"
                  },
                  {
                    id: "cop28-climate",
                    title: "COP28气候大会",
                    description: "第28届联合国气候变化大会深度报道",
                    coverImage: "bg-gradient-to-br from-green-600 to-blue-600",
                    url: "/topic/cop28-climate/",
                    articles: 156,
                    channels: ["国际", "环境", "科技"],
                    tags: ["气候变化", "碳中和", "绿色能源"],
                    lastUpdate: "4小时前"
                  },
                  {
                    id: "ai-governance",
                    title: "AI治理与监管",
                    description: "人工智能发展的法律法规与治理探索",
                    coverImage: "bg-gradient-to-br from-purple-600 to-indigo-600",
                    url: "/topic/ai-governance/",
                    articles: 189,
                    channels: ["科技", "时政", "法律"],
                    tags: ["AI监管", "数字治理", "技术伦理"],
                    lastUpdate: "6小时前"
                  },
                  {
                    id: "spring-festival-2024",
                    title: "春节返乡2024",
                    description: "春运、民俗、经济、社会现象全景观察",
                    coverImage: "bg-gradient-to-br from-red-600 to-yellow-600",
                    url: "/topic/spring-festival-2024/",
                    articles: 98,
                    channels: ["社会", "交通", "文化", "经济"],
                    tags: ["春运", "传统文化", "消费升级"],
                    lastUpdate: "1小时前"
                  }
                ].map((topic, index) => (
                  <article key={topic.id} className="group cursor-pointer bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-xl transition-all duration-300">
                    {/* 专题封面 */}
                    <div className={`relative h-48 ${topic.coverImage} flex items-center justify-center`}>
                      <div className="absolute inset-0 bg-black/30"></div>
                      <h3 className="relative text-white text-2xl font-bold text-center">{topic.title}</h3>
                      <div className="absolute top-4 right-4 bg-red-500 text-white px-3 py-1 rounded-full text-sm font-semibold">
                        {topic.articles}篇
                      </div>
                    </div>

                    {/* 专题信息 */}
                    <div className="p-6">
                      <p className="text-gray-600 mb-4 leading-relaxed">{topic.description}</p>
                      
                      {/* 涉及频道 */}
                      <div className="mb-4">
                        <h4 className="text-sm font-semibold text-gray-500 mb-2">涉及频道：</h4>
                        <div className="flex flex-wrap gap-2">
                          {topic.channels.map((channel, idx) => (
                            <span key={idx} className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
                              {channel}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* 相关标签 */}
                      <div className="mb-4">
                        <h4 className="text-sm font-semibold text-gray-500 mb-2">相关标签：</h4>
                        <div className="flex flex-wrap gap-2">
                          {topic.tags.map((tag, idx) => (
                            <span key={idx} className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs font-medium">
                              #{tag}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* 更新时间 */}
                      <div className="flex items-center justify-between text-sm text-gray-500">
                        <span>最后更新：{topic.lastUpdate}</span>
                        <span className="text-red-600 font-medium group-hover:text-red-700">查看专题 →</span>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </section>

            {/* 视频新闻 */}
            <section>
              <h2 className="text-3xl font-bold text-gray-900 mb-8 border-b-4 border-red-600 pb-3">
                🎬 视频新闻
              </h2>
              
              <div className="bg-gradient-to-r from-red-50 to-orange-50 p-6 rounded-lg mb-8">
                <div className="text-sm text-red-800">
                  💡 这里展示<strong>专业视频新闻系统</strong>，包含直播、专访、新闻回放等多种形式
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* 主要视频 */}
                <div className="lg:col-span-2">
                  {videoNews.filter(video => video.isLive).map((video) => (
                    <div key={video.id} className="relative group cursor-pointer mb-8">
                      <div className="relative overflow-hidden rounded-xl">
                        <img 
                          src={video.thumbnail} 
                          alt={video.title}
                          className="w-full h-64 lg:h-80 object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                        
                        {/* 视频覆盖层 */}
                        <div className="absolute inset-0 bg-black/30 group-hover:bg-black/40 transition-all duration-300"></div>
                        
                        {/* 播放按钮 */}
                        <div 
                          onClick={() => {
                            setCurrentVideo(video);
                            setVideoPlayerOpen(true);
                          }}
                          className="absolute inset-0 flex items-center justify-center"
                        >
                          <div className="w-20 h-20 bg-red-600 rounded-full flex items-center justify-center shadow-2xl group-hover:scale-110 transition-transform duration-300">
                            <svg className="w-8 h-8 text-white ml-1" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M8 5v14l11-7z"/>
                            </svg>
                          </div>
                        </div>
                        
                        {/* 视频信息覆盖 */}
                        <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/80 to-transparent">
                          <div className="flex items-center space-x-2 mb-3">
                            {video.isLive && (
                              <span className="bg-red-600 text-white px-3 py-1 text-sm font-bold rounded-full animate-pulse">
                                🔴 直播中
                              </span>
                            )}
                            <span className="bg-black/50 text-white px-3 py-1 text-sm rounded-full">
                              {video.category}
                            </span>
                            <span className="bg-black/50 text-white px-3 py-1 text-sm rounded-full">
                              {video.views} 观看
                            </span>
                          </div>
                          <h3 className="text-xl font-bold text-white mb-2 group-hover:text-red-300 transition-colors">
                            {video.title}
                          </h3>
                          <p className="text-gray-200 text-sm leading-relaxed">
                            {video.description}
                          </p>
                        </div>
                        
                        {/* 时长显示 */}
                        <div className="absolute top-4 right-4">
                          <span className="bg-black/70 text-white px-2 py-1 text-sm rounded">
                            {video.duration}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                
                {/* 其他视频列表 */}
                {videoNews.filter(video => !video.isLive).map((video) => (
                  <div key={video.id} className="group cursor-pointer">
                    <div className="relative overflow-hidden rounded-lg mb-4">
                      <img 
                        src={video.thumbnail} 
                        alt={video.title}
                        className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                      
                      {/* 播放按钮 */}
                      <div 
                        onClick={() => {
                          setCurrentVideo(video);
                          setVideoPlayerOpen(true);
                        }}
                        className="absolute inset-0 bg-black/20 group-hover:bg-black/40 flex items-center justify-center transition-all duration-300"
                      >
                        <div className="w-16 h-16 bg-red-600 rounded-full flex items-center justify-center shadow-xl group-hover:scale-110 transition-transform duration-300">
                          <svg className="w-6 h-6 text-white ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M8 5v14l11-7z"/>
                          </svg>
                        </div>
                      </div>
                      
                      {/* 时长和标签 */}
                      <div className="absolute top-3 left-3">
                        <span className="bg-black/70 text-white px-2 py-1 text-xs rounded">
                          {video.duration}
                        </span>
                      </div>
                      
                      <div className="absolute top-3 right-3">
                        <span className="bg-red-600 text-white px-2 py-1 text-xs rounded">
                          {video.category}
                        </span>
                      </div>
                      
                      <div className="absolute bottom-3 right-3">
                        <span className="bg-black/70 text-white px-2 py-1 text-xs rounded">
                          {video.views} 观看
                        </span>
                      </div>
                    </div>
                    
                    <div>
                      <h4 className="font-bold text-gray-900 mb-2 group-hover:text-red-600 transition-colors">
                        {video.title}
                      </h4>
                      <p className="text-sm text-gray-600 mb-3 leading-relaxed">
                        {video.description}
                      </p>
                      
                      {/* 标签 */}
                      <div className="flex flex-wrap gap-2 mb-2">
                        {video.tags.map((tag, index) => (
                          <span key={index} className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full hover:bg-red-100 hover:text-red-600 cursor-pointer transition-all">
                            #{tag}
                          </span>
                        ))}
                      </div>
                      
                      <div className="text-xs text-gray-500">
                        {video.time}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              
              {/* 更多视频链接 */}
              <div className="text-center mt-8">
                <button className="bg-red-600 hover:bg-red-700 text-white px-8 py-3 rounded-lg font-semibold transition-all duration-300 shadow-lg hover:shadow-xl">
                  查看更多视频 →
                </button>
              </div>
            </section>

            {/* 图片新闻 */}
            <section>
              <h2 className="text-3xl font-bold text-gray-900 mb-8 border-b-4 border-gray-600 pb-3">
                📸 图片新闻
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <article className="relative group cursor-pointer">
                  <div className="relative h-64 rounded-xl overflow-hidden">
                    <div className="w-full h-full bg-gradient-to-br from-purple-600 to-indigo-700 flex items-center justify-center group-hover:scale-105 transition-transform duration-500">
                      <span className="text-white text-2xl font-bold">科技大会</span>
                    </div>
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent"></div>
                    <div className="absolute bottom-0 left-0 right-0 p-6">
                      <h4 className="text-white font-bold text-lg mb-2">
                        世界互联网大会在乌镇开幕
                      </h4>
                      <p className="text-gray-200 text-sm">
                        全球科技领袖齐聚探讨数字未来
                      </p>
                    </div>
                  </div>
                </article>

                <article className="relative group cursor-pointer">
                  <div className="relative h-64 rounded-xl overflow-hidden">
                    <div className="w-full h-full bg-gradient-to-br from-pink-600 to-rose-700 flex items-center justify-center group-hover:scale-105 transition-transform duration-500">
                      <span className="text-white text-2xl font-bold">文化交流</span>
                    </div>
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent"></div>
                    <div className="absolute bottom-0 left-0 right-0 p-6">
                      <h4 className="text-white font-bold text-lg mb-2">
                        中外文化交流年系列活动启动
                      </h4>
                      <p className="text-gray-200 text-sm">
                        促进多元文化对话与合作
                      </p>
                    </div>
                  </div>
                </article>

                <article className="relative group cursor-pointer">
                  <div className="relative h-64 rounded-xl overflow-hidden">
                    <div className="w-full h-full bg-gradient-to-br from-teal-600 to-cyan-700 flex items-center justify-center group-hover:scale-105 transition-transform duration-500">
                      <span className="text-white text-2xl font-bold">绿色发展</span>
                    </div>
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent"></div>
                    <div className="absolute bottom-0 left-0 right-0 p-6">
                      <h4 className="text-white font-bold text-lg mb-2">
                        全国生态保护大会召开
                      </h4>
                      <p className="text-gray-200 text-sm">
                        推进生态文明建设新进展
                      </p>
                    </div>
                  </div>
                </article>
              </div>
            </section>
          </div>

          {/* 右侧边栏 (1/3) */}
          <div className="space-y-8">
            {/* 实时更新 */}
            <div className="bg-gray-50 p-6 rounded-lg">
              <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
                <span className="w-3 h-3 bg-red-600 rounded-full mr-2 animate-pulse"></span>
                实时更新
              </h3>
              <div className="space-y-4">
                {liveUpdates.map((update, index) => (
                  <div key={index} className="flex">
                    <span className="text-sm text-gray-500 font-mono mr-3 flex-shrink-0">
                      {update.time}
                    </span>
                    <p className="text-sm text-gray-800">{update.content}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* 最多阅读 */}
            <div>
              <h3 className="text-lg font-bold text-gray-900 mb-4 border-b-2 border-red-600 pb-2">
                最多阅读
              </h3>
              <div className="space-y-3">
                {mostRead.map((article, index) => (
                  <div key={article.id} className="flex items-start space-x-3 pb-3 border-b border-gray-100">
                    <span className="text-red-600 font-bold text-lg flex-shrink-0">
                      {index + 1}
                    </span>
                    <div className="flex-1">
                      <h4 className="text-sm font-semibold text-gray-900 hover:text-red-600 cursor-pointer mb-1">
                        {article.title}
                      </h4>
                      <span className="text-xs text-gray-500">{article.reads} 阅读</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 市场数据 */}
            <div>
              <h3 className="text-lg font-bold text-gray-900 mb-4 border-b-2 border-red-600 pb-2">
                市场行情
              </h3>
              <div className="space-y-3">
                {marketData.map((market) => (
                  <div key={market.name} className="flex items-center justify-between py-2">
                    <span className="text-sm font-medium text-gray-900">{market.name}</span>
                    <div className="text-right">
                      <div className="text-sm font-semibold text-gray-900">{market.value}</div>
                      <div className={`text-xs font-medium ${
                        market.trend === "up" ? "text-green-600" : "text-red-600"
                      }`}>
                        {market.trend === "up" ? "↗" : "↘"} {market.change}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="text-xs text-gray-500 mt-4 text-center">
                数据更新时间：16:00
              </div>
            </div>

            {/* 天气信息 */}
            <div className="bg-blue-50 p-4 rounded-lg">
              <h4 className="font-semibold text-gray-900 mb-2">今日天气</h4>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-gray-600">北京</div>
                  <div className="text-xs text-gray-500">晴朗</div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-gray-900">22°C</div>
                  <div className="text-xs text-gray-500">体感温度 24°C</div>
                </div>
              </div>
            </div>

            {/* 广告位 */}
            <div className="bg-gray-100 p-6 rounded-lg text-center">
              <div className="text-gray-500 text-sm mb-2">广告</div>
              <div className="bg-white p-4 rounded">
                <div className="text-gray-700 font-medium">广告内容位置</div>
                <div className="text-gray-500 text-sm mt-1">Advertisement</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 页脚 */}
      <footer className="bg-gray-900 text-white py-12 mt-16">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <h4 className="font-bold mb-4">新闻服务</h4>
              <ul className="space-y-2 text-sm text-gray-300">
                <li><a href="#" className="hover:text-white">移动应用</a></li>
                <li><a href="#" className="hover:text-white">邮件订阅</a></li>
                <li><a href="#" className="hover:text-white">RSS订阅</a></li>
                <li><a href="#" className="hover:text-white">播客</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold mb-4">关于我们</h4>
              <ul className="space-y-2 text-sm text-gray-300">
                <li><a href="#" className="hover:text-white">公司简介</a></li>
                <li><a href="#" className="hover:text-white">编辑方针</a></li>
                <li><a href="#" className="hover:text-white">联系我们</a></li>
                <li><a href="#" className="hover:text-white">招聘信息</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold mb-4">法律条款</h4>
              <ul className="space-y-2 text-sm text-gray-300">
                <li><a href="#" className="hover:text-white">使用条款</a></li>
                <li><a href="#" className="hover:text-white">隐私政策</a></li>
                <li><a href="#" className="hover:text-white">Cookie政策</a></li>
                <li><a href="#" className="hover:text-white">版权声明</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold mb-4">关注我们</h4>
              <div className="flex space-x-4">
                <a href="#" className="text-gray-300 hover:text-white">
                  <span className="sr-only">Facebook</span>
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                  </svg>
                </a>
                <a href="#" className="text-gray-300 hover:text-white">
                  <span className="sr-only">Twitter</span>
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/>
                  </svg>
                </a>
              </div>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-sm text-gray-400">
            <p>&copy; 2024 新闻网. 保留所有权利. | 新闻许可证号：123456789</p>
          </div>
        </div>
      </footer>

      {/* 专业视频播放器弹窗 */}
      {videoPlayerOpen && currentVideo && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-black rounded-2xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden animate-fadeInUp">
            {/* 播放器头部 */}
            <div className="flex items-center justify-between p-6 bg-gray-900 text-white">
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  {currentVideo.isLive && (
                    <span className="bg-red-600 text-white px-3 py-1 text-sm font-bold rounded-full animate-pulse">
                      🔴 直播中
                    </span>
                  )}
                  <span className="text-red-400 font-semibold">{currentVideo.category}</span>
                  <span className="text-gray-400">•</span>
                  <span className="text-gray-400">{currentVideo.views} 观看</span>
                  <span className="text-gray-400">•</span>
                  <span className="text-gray-400">{currentVideo.time}</span>
                </div>
              </div>
              
              <div className="flex items-center space-x-4">
                {/* 画质选择 */}
                <select className="bg-gray-700 text-white text-sm px-3 py-1 rounded">
                  <option>1080P</option>
                  <option>720P</option>
                  <option>480P</option>
                </select>
                
                {/* 全屏按钮 */}
                <button className="p-2 hover:bg-gray-700 rounded transition-all" title="全屏">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                  </svg>
                </button>
                
                {/* 关闭按钮 */}
                <button
                  onClick={() => {
                    setVideoPlayerOpen(false);
                    setCurrentVideo(null);
                  }}
                  className="p-2 hover:bg-gray-700 rounded transition-all"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* 播放器主体 */}
            <div className="relative bg-black">
              <div className="relative aspect-video bg-gray-900 flex items-center justify-center">
                <img 
                  src={currentVideo.thumbnail} 
                  alt={currentVideo.title}
                  className="w-full h-full object-cover"
                />
                
                {/* 播放控制覆盖层 */}
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                  <div className="text-center">
                    <div className="w-24 h-24 bg-red-600 rounded-full flex items-center justify-center shadow-2xl mb-4 mx-auto hover:scale-110 transition-transform cursor-pointer">
                      <svg className="w-10 h-10 text-white ml-1" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M8 5v14l11-7z"/>
                      </svg>
                    </div>
                    <p className="text-white text-lg font-semibold">
                      {currentVideo.isLive ? "加入直播" : "开始播放"}
                    </p>
                    <p className="text-gray-300 text-sm mt-2">
                      模拟播放器 - 实际项目中集成真实视频播放器
                    </p>
                  </div>
                </div>
                
                {/* 播放器控制条 */}
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-6">
                  <div className="flex items-center space-x-4">
                    {/* 播放/暂停 */}
                    <button className="text-white hover:text-red-400 transition-colors">
                      <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M8 5v14l11-7z"/>
                      </svg>
                    </button>
                    
                    {/* 进度条 */}
                    <div className="flex-1 bg-gray-600 rounded-full h-2 relative">
                      <div className="bg-red-600 h-2 rounded-full w-1/3"></div>
                      <div className="absolute top-1/2 left-1/3 transform -translate-y-1/2 w-4 h-4 bg-red-600 rounded-full shadow-lg"></div>
                    </div>
                    
                    {/* 时间显示 */}
                    <span className="text-white text-sm font-mono">
                      {currentVideo.isLive ? "LIVE" : "15:30 / " + currentVideo.duration}
                    </span>
                    
                    {/* 音量 */}
                    <button className="text-white hover:text-red-400 transition-colors">
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M9 12H5a1 1 0 01-1-1V9a1 1 0 011-1h4l1.5-1.5A1 1 0 0112 7.5v9a1 1 0 01-1.5.9L9 16z" />
                      </svg>
                    </button>
                  </div>
                </div>
                
                {/* 直播观看人数 */}
                {currentVideo.isLive && (
                  <div className="absolute top-4 left-4 bg-red-600 text-white px-3 py-1 rounded-full text-sm font-semibold">
                    {currentVideo.views} 人正在观看
                  </div>
                )}
              </div>
            </div>

            {/* 视频信息和互动区域 */}
            <div className="bg-gray-900 text-white p-6">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* 视频信息 */}
                <div className="lg:col-span-2">
                  <h2 className="text-2xl font-bold mb-3">{currentVideo.title}</h2>
                  <p className="text-gray-300 mb-4 leading-relaxed">{currentVideo.description}</p>
                  
                  {/* 标签 */}
                  <div className="flex flex-wrap gap-2 mb-4">
                    {currentVideo.tags.map((tag: string, index: number) => (
                      <span key={index} className="px-3 py-1 bg-gray-700 text-gray-300 text-sm rounded-full hover:bg-red-600 hover:text-white cursor-pointer transition-all">
                        #{tag}
                      </span>
                    ))}
                  </div>
                  
                  {/* 操作按钮 */}
                  <div className="flex items-center space-x-4">
                    <button className="flex items-center space-x-2 bg-red-600 hover:bg-red-700 px-4 py-2 rounded-lg transition-all">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                      </svg>
                      <span>收藏</span>
                    </button>
                    <button className="flex items-center space-x-2 bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded-lg transition-all">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
                      </svg>
                      <span>分享</span>
                    </button>
                    <button className="flex items-center space-x-2 bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded-lg transition-all">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <span>下载</span>
                    </button>
                  </div>
                </div>
                
                {/* 实时评论/相关视频 */}
                <div className="bg-gray-800 rounded-lg p-4">
                  <h3 className="font-bold mb-4">
                    {currentVideo.isLive ? "实时评论" : "相关视频"}
                  </h3>
                  
                  {currentVideo.isLive ? (
                    <div className="space-y-3 max-h-64 overflow-y-auto">
                      {/* 模拟实时评论 */}
                      <div className="text-sm">
                        <span className="text-blue-400 font-semibold">用户001:</span>
                        <span className="text-gray-300 ml-2">这个协议太重要了！</span>
                      </div>
                      <div className="text-sm">
                        <span className="text-green-400 font-semibold">专家ABC:</span>
                        <span className="text-gray-300 ml-2">确实具有历史意义</span>
                      </div>
                      <div className="text-sm">
                        <span className="text-yellow-400 font-semibold">观察者X:</span>
                        <span className="text-gray-300 ml-2">希望能真正落实</span>
                      </div>
                      
                      {/* 评论输入框 */}
                      <div className="mt-4">
                        <input 
                          type="text" 
                          placeholder="发表评论..." 
                          className="w-full bg-gray-700 text-white px-3 py-2 rounded-lg text-sm"
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {/* 相关视频推荐 */}
                      {videoNews.filter(v => v.id !== currentVideo.id).slice(0, 2).map((video) => (
                        <div key={video.id} className="flex space-x-3 cursor-pointer hover:bg-gray-700 p-2 rounded transition-all">
                          <img src={video.thumbnail} alt={video.title} className="w-16 h-12 object-cover rounded" />
                          <div className="flex-1">
                            <h4 className="text-sm font-semibold text-gray-200 line-clamp-2">{video.title}</h4>
                            <p className="text-xs text-gray-400 mt-1">{video.views} 观看 • {video.time}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 专业评论系统弹窗 */}
      {commentsOpen && currentArticle && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden animate-slideInFromTop">
            {/* 评论头部 */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gray-50">
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                  <h2 className="text-xl font-bold text-gray-900">评论讨论</h2>
                  <span className="bg-blue-100 text-blue-600 px-2 py-1 text-sm rounded-full font-semibold">
                    {mockComments.length} 条评论
                  </span>
                </div>
              </div>
              
              <div className="flex items-center space-x-4">
                {/* 排序选项 */}
                <select className="text-sm border border-gray-300 rounded-lg px-3 py-2 bg-white">
                  <option>最新评论</option>
                  <option>最热评论</option>
                  <option>按时间排序</option>
                </select>
                
                {/* 关闭按钮 */}
                <button
                  onClick={() => {
                    setCommentsOpen(false);
                    setCurrentArticle(null);
                  }}
                  className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-all"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* 文章信息简要展示 */}
            <div className="p-6 bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-gray-200">
              <div className="flex items-start space-x-4">
                <img 
                  src={currentArticle.image} 
                  alt={currentArticle.title}
                  className="w-24 h-16 object-cover rounded-lg"
                />
                <div className="flex-1">
                  <h3 className="font-bold text-gray-900 mb-2 line-clamp-2">{currentArticle.title}</h3>
                  <div className="flex items-center space-x-4 text-sm text-gray-600">
                    <span className="bg-red-100 text-red-600 px-2 py-1 rounded-full font-semibold">
                      {currentArticle.category}
                    </span>
                    <span>{currentArticle.time}</span>
                    <span>• 阅读量 12.5K</span>
                  </div>
                </div>
              </div>
            </div>

            {/* 发表评论区域 */}
            <div className="p-6 bg-gray-50 border-b border-gray-200">
              <div className="flex items-start space-x-4">
                <img 
                  src="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMjAiIGN5PSIyMCIgcj0iMjAiIGZpbGw9IiM2MzY2ZjEiLz4KPHN2ZyB4PSI4IiB5PSI4IiB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSI+CjxwYXRoIGQ9Ik0xNiA3QTQgNCAwIDExOCA3QTQgNCAwIDAxMTYgN1pNMTIgMTRBNyA3IDAgMDA1IDIxSDEzQTcgNyAwIDAwMTIgMTRaIiBzdHJva2U9IndoaXRlIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIvPgo8L3N2Zz4KPC9zdmc+"
                  alt="用户头像" 
                  className="w-10 h-10 rounded-full"
                />
                <div className="flex-1">
                  <textarea
                    value={userComment}
                    onChange={(e) => setUserComment(e.target.value)}
                    placeholder="写下你的看法..."
                    className="w-full p-4 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                    rows={3}
                  />
                  <div className="flex items-center justify-between mt-3">
                    <div className="flex items-center space-x-4 text-sm text-gray-500">
                      <button className="flex items-center space-x-1 hover:text-blue-600">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4V2a1 1 0 011-1h8a1 1 0 011 1v2m-9 0h10m-10 0l1 16a1 1 0 001 1h8a1 1 0 001-1l1-16m-10 0V4" />
                        </svg>
                        <span>表情</span>
                      </button>
                      <button className="flex items-center space-x-1 hover:text-blue-600">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <span>图片</span>
                      </button>
                      <span className="text-xs">{userComment.length}/500</span>
                    </div>
                    <button 
                      onClick={() => {
                        if (userComment.trim()) {
                          // 这里可以添加发布评论的逻辑
                          setUserComment("");
                        }
                      }}
                      disabled={!userComment.trim()}
                      className={`px-6 py-2 rounded-lg font-semibold transition-all ${
                        userComment.trim() 
                          ? 'bg-blue-600 text-white hover:bg-blue-700' 
                          : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      }`}
                    >
                      发布评论
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* 评论列表 */}
            <div className="flex-1 overflow-y-auto max-h-96">
              <div className="p-6 space-y-6">
                {mockComments.map((comment) => (
                  <div key={comment.id} className="flex items-start space-x-4 p-4 rounded-lg hover:bg-gray-50 transition-all">
                    <img 
                      src={comment.avatar} 
                      alt={comment.author}
                      className="w-10 h-10 rounded-full flex-shrink-0"
                    />
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <h4 className="font-semibold text-gray-900">{comment.author}</h4>
                        {comment.isVerified && (
                          <svg className="w-4 h-4 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                        )}
                        <span className="text-sm text-gray-500">{comment.time}</span>
                      </div>
                      <p className="text-gray-700 mb-3 leading-relaxed">{comment.content}</p>
                      
                      {/* 评论互动 */}
                      <div className="flex items-center space-x-6 text-sm">
                        <button className="flex items-center space-x-1 text-gray-500 hover:text-red-600 transition-all">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                          </svg>
                          <span>{comment.likes}</span>
                        </button>
                        <button className="flex items-center space-x-1 text-gray-500 hover:text-blue-600 transition-all">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                          </svg>
                          <span>回复</span>
                        </button>
                        {comment.replies > 0 && (
                          <button className="text-blue-600 hover:text-blue-700 transition-all">
                            查看 {comment.replies} 条回复 →
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              
              {/* 加载更多 */}
              <div className="p-6 text-center border-t border-gray-200">
                <button className="text-blue-600 hover:text-blue-700 font-semibold">
                  加载更多评论
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 返回演示首页 */}
      <div className="fixed bottom-6 right-6">
        <Link
          href="/portal/demo"
          className="bg-red-600 hover:bg-red-700 text-white p-4 rounded-full shadow-2xl transition-all duration-300"
          title="返回演示首页"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
        </Link>
      </div>
    </div>
    </>
  );
}