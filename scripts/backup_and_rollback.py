#!/usr/bin/env python
"""
数据备份和回滚脚本

用于第二阶段数据模型升级的备份和回滚操作
"""

import os
import sys
import json
import subprocess
from datetime import datetime
from pathlib import Path

# 添加项目根目录到Python路径
BASE_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE_DIR))

def backup_database():
    """备份数据库"""
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    backup_dir = BASE_DIR / "backups" / timestamp
    backup_dir.mkdir(parents=True, exist_ok=True)
    
    print(f"🔄 开始数据库备份...")
    print(f"📁 备份目录: {backup_dir}")
    
    # 备份PostgreSQL数据库
    try:
        db_backup_file = backup_dir / "database.sql"
        cmd = [
            "docker", "exec", "local-postgres-1",
            "pg_dump", "-U", "news", "-d", "news", "-f", "/tmp/database.sql"
        ]
        subprocess.run(cmd, check=True)
        
        # 复制备份文件到主机
        subprocess.run([
            "docker", "cp", "local-postgres-1:/tmp/database.sql", str(db_backup_file)
        ], check=True)
        
        print(f"✅ 数据库备份完成: {db_backup_file}")
        
    except subprocess.CalledProcessError as e:
        print(f"❌ 数据库备份失败: {e}")
        return False
    
    # 备份模型配置
    try:
        model_backup_file = backup_dir / "model_config.json"
        model_config = {
            "timestamp": timestamp,
            "migration_files": [
                "0002_align_article_model_with_design.py",
                "0003_add_optimization_indexes.py"
            ],
            "new_fields": [
                "canonical_url",
                "allow_aggregate", 
                "is_featured",
                "weight",
                "source_site",
                "publish_at",
                "updated_at"
            ],
            "new_indexes": [
                "art_pub_chan_reg",
                "art_feat_weight_pub", 
                "art_lang_region",
                "art_video_feat",
                "art_pub_chan_reg_opt",
                "art_feat_weight_pub_opt"
            ]
        }
        
        with open(model_backup_file, 'w', encoding='utf-8') as f:
            json.dump(model_config, f, indent=2, ensure_ascii=False)
        
        print(f"✅ 模型配置备份完成: {model_backup_file}")
        
    except Exception as e:
        print(f"❌ 模型配置备份失败: {e}")
        return False
    
    # 创建备份信息文件
    info_file = backup_dir / "backup_info.txt"
    with open(info_file, 'w', encoding='utf-8') as f:
        f.write(f"备份时间: {datetime.now().isoformat()}\n")
        f.write(f"备份类型: 第二阶段数据模型升级\n")
        f.write(f"包含内容:\n")
        f.write(f"  - 数据库完整备份\n")
        f.write(f"  - 模型配置信息\n")
        f.write(f"  - 迁移文件列表\n")
        f.write(f"\n回滚方法:\n")
        f.write(f"  1. 恢复数据库: docker exec -i local-postgres-1 psql -U news -d news < {db_backup_file.name}\n")
        f.write(f"  2. 回滚迁移: python manage.py migrate news 0002\n")
        f.write(f"  3. 删除新字段和索引\n")
    
    print(f"✅ 备份信息文件创建完成: {info_file}")
    print(f"🎯 备份完成！备份目录: {backup_dir}")
    
    return True

def rollback_migration():
    """回滚迁移"""
    print(f"🔄 开始回滚迁移...")
    
    try:
        # 回滚到0002版本
        cmd = ["docker", "exec", "local-authoring-1", "python", "manage.py", "migrate", "news", "0002"]
        subprocess.run(cmd, check=True)
        
        print("✅ 迁移回滚完成")
        return True
        
    except subprocess.CalledProcessError as e:
        print(f"❌ 迁移回滚失败: {e}")
        return False

def restore_database(backup_file):
    """恢复数据库"""
    if not Path(backup_file).exists():
        print(f"❌ 备份文件不存在: {backup_file}")
        return False
    
    print(f"🔄 开始恢复数据库...")
    
    try:
        # 恢复数据库
        cmd = ["docker", "exec", "-i", "local-postgres-1", "psql", "-U", "news", "-d", "news"]
        with open(backup_file, 'r') as f:
            subprocess.run(cmd, stdin=f, check=True)
        
        print("✅ 数据库恢复完成")
        return True
        
    except subprocess.CalledProcessError as e:
        print(f"❌ 数据库恢复失败: {e}")
        return False

def main():
    """主函数"""
    if len(sys.argv) < 2:
        print("使用方法:")
        print("  python scripts/backup_and_rollback.py backup     # 创建备份")
        print("  python scripts/backup_and_rollback.py rollback   # 回滚迁移")
        print("  python scripts/backup_and_rollback.py restore <backup_file>  # 恢复数据库")
        return
    
    command = sys.argv[1]
    
    if command == "backup":
        backup_database()
    elif command == "rollback":
        rollback_migration()
    elif command == "restore":
        if len(sys.argv) < 3:
            print("❌ 请指定备份文件路径")
            return
        restore_database(sys.argv[2])
    else:
        print(f"❌ 未知命令: {command}")

if __name__ == "__main__":
    main()
