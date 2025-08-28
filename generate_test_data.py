#!/usr/bin/env python3
"""
生成测试数据脚本
为ClickHouse生成用户行为数据，为推荐系统提供基础数据
"""

import random
import datetime
from clickhouse_driver import Client
import time

# ClickHouse连接配置
CLICKHOUSE_URL = "clickhouse://default:@clickhouse:9000/default"

def generate_clickhouse_data():
    """生成ClickHouse测试数据"""
    print("🔄 连接到ClickHouse...")
    
    try:
        client = Client.from_url(CLICKHOUSE_URL)
        
        # 测试连接
        client.execute("SELECT 1")
        print("✅ ClickHouse连接成功!")
        
        # 准备文章ID列表（假设我们有这些文章）
        article_ids = [
            'article_1', 'article_2', 'article_3', 'article_4', 'article_5',
            'article_6', 'article_7', 'article_8', 'article_9', 'article_10',
            'article_11', 'article_12', 'article_13', 'article_14', 'article_15'
        ]
        
        # 渠道列表
        channels = ['ai-news', 'ai-tools', 'ai-tutorials', 'tech-news']
        
        # 生成过去7天的数据
        events_data = []
        base_time = datetime.datetime.now() - datetime.timedelta(days=7)
        
        print("📊 生成用户行为数据...")
        
        for day in range(7):  # 7天数据
            current_time = base_time + datetime.timedelta(days=day)
            
            for hour in range(24):  # 每天24小时
                hour_time = current_time + datetime.timedelta(hours=hour)
                
                # 每小时生成随机数量的事件
                events_per_hour = random.randint(50, 200)
                
                for _ in range(events_per_hour):
                    article_id = random.choice(article_ids)
                    channel = random.choice(channels)
                    
                    # 生成随机时间（在该小时内）
                    minute = random.randint(0, 59)
                    second = random.randint(0, 59)
                    event_time = hour_time + datetime.timedelta(minutes=minute, seconds=second)
                    
                    # 生成impression事件
                    events_data.append((
                        event_time,
                        'localhost',
                        channel,
                        article_id,
                        'impression',
                        0,  # dwell_ms
                        f'user_{random.randint(1, 1000)}',
                        f'session_{random.randint(1, 500)}'
                    ))
                    
                    # 30%概率生成click事件
                    if random.random() < 0.3:
                        click_time = event_time + datetime.timedelta(seconds=random.randint(1, 30))
                        events_data.append((
                            click_time,
                            'localhost',
                            channel,
                            article_id,
                            'click',
                            0,  # dwell_ms
                            f'user_{random.randint(1, 1000)}',
                            f'session_{random.randint(1, 500)}'
                        ))
                        
                        # 50%概率生成dwell事件
                        if random.random() < 0.5:
                            dwell_time = click_time + datetime.timedelta(seconds=random.randint(10, 300))
                            dwell_ms = random.randint(10000, 300000)  # 10秒到5分钟
                            events_data.append((
                                dwell_time,
                                'localhost',
                                channel,
                                article_id,
                                'dwell',
                                dwell_ms,
                                f'user_{random.randint(1, 1000)}',
                                f'session_{random.randint(1, 500)}'
                            ))
        
        print(f"📝 准备插入 {len(events_data)} 条事件记录...")
        
        # 批量插入数据
        batch_size = 1000
        for i in range(0, len(events_data), batch_size):
            batch = events_data[i:i + batch_size]
            client.execute(
                """
                INSERT INTO events (ts, site, channel, article_id, event, dwell_ms, user_id, session_id)
                VALUES
                """,
                batch
            )
            print(f"✅ 已插入 {min(i + batch_size, len(events_data))}/{len(events_data)} 条记录")
        
        # 等待物化视图处理数据
        print("⏳ 等待物化视图处理数据...")
        time.sleep(5)
        
        # 检查结果
        total_events = client.execute("SELECT COUNT(*) FROM events")[0][0]
        total_agg = client.execute("SELECT COUNT(*) FROM article_metrics_agg")[0][0]
        
        print(f"🎉 数据生成完成!")
        print(f"📊 Events表: {total_events} 条记录")
        print(f"📈 Metrics表: {total_agg} 条聚合记录")
        
        # 显示一些示例数据
        print("\n📋 最新的聚合数据示例:")
        sample_data = client.execute("""
            SELECT 
                window_start,
                site,
                channel,
                article_id,
                impressions,
                clicks,
                clicks/impressions*100 as ctr_percent
            FROM article_metrics_agg 
            WHERE impressions > 0
            ORDER BY window_start DESC 
            LIMIT 10
        """)
        
        for row in sample_data:
            print(f"  {row[0]} | {row[1]} | {row[2]} | {row[3]} | 展示:{row[4]} 点击:{row[5]} CTR:{row[6]:.2f}%")
            
    except Exception as e:
        print(f"❌ 错误: {e}")
        return False
    
    return True

if __name__ == "__main__":
    print("🚀 开始生成测试数据...")
    success = generate_clickhouse_data()
    
    if success:
        print("\n✅ 测试数据生成成功!")
        print("🔄 现在推荐系统应该能正常工作了!")
        print("🌐 请访问 http://localhost:3000/feed 查看智能推荐效果")
    else:
        print("\n❌ 测试数据生成失败!")
