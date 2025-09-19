"""
Django管理命令：同步文章统计数据
用于修复ArticlePage统计字段与Web Users系统互动记录的数据不一致问题
"""
from django.core.management.base import BaseCommand
from django.db import transaction
from apps.news.models.article import ArticlePage
from apps.web_users.models import UserInteraction, UserFavorite, UserComment


class Command(BaseCommand):
    help = '同步文章统计数据，修复ArticlePage统计字段与Web Users互动记录的不一致'

    def add_arguments(self, parser):
        parser.add_argument(
            '--article-id',
            type=str,
            help='指定文章ID，只同步该文章的统计数据'
        )
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='只显示将要更新的数据，不实际执行更新'
        )
        parser.add_argument(
            '--batch-size',
            type=int,
            default=100,
            help='批处理大小（默认100）'
        )

    def handle(self, *args, **options):
        article_id = options.get('article_id')
        dry_run = options.get('dry_run')
        batch_size = options.get('batch_size')

        if dry_run:
            self.stdout.write(
                self.style.WARNING('🔍 DRY RUN 模式：只显示将要更新的数据，不实际执行更新')
            )

        # 获取要处理的文章
        if article_id:
            try:
                articles = ArticlePage.objects.filter(id=article_id)
                if not articles.exists():
                    self.stdout.write(
                        self.style.ERROR(f'❌ 文章 ID {article_id} 不存在')
                    )
                    return
            except ValueError:
                self.stdout.write(
                    self.style.ERROR(f'❌ 无效的文章 ID: {article_id}')
                )
                return
        else:
            articles = ArticlePage.objects.all()

        total_articles = articles.count()
        self.stdout.write(f'📊 总共需要处理 {total_articles} 篇文章')

        updated_count = 0
        error_count = 0

        # 分批处理文章
        for i in range(0, total_articles, batch_size):
            batch_articles = articles[i:i + batch_size]
            
            for article in batch_articles:
                try:
                    # 统计该文章的互动数据
                    like_count = UserInteraction.objects.filter(
                        target_type='article',
                        target_id=str(article.id),
                        interaction_type='like'
                    ).count()

                    favorite_count = UserFavorite.objects.filter(
                        article_id=str(article.id)
                    ).count()

                    comment_count = UserComment.objects.filter(
                        article_id=str(article.id),
                        status='published'
                    ).count()

                    # 检查是否需要更新
                    needs_update = (
                        article.like_count != like_count or
                        article.favorite_count != favorite_count or
                        article.comment_count != comment_count
                    )

                    if needs_update:
                        self.stdout.write(
                            f'📝 文章 [{article.id}] {article.title[:50]}...'
                        )
                        self.stdout.write(
                            f'   点赞: {article.like_count} → {like_count}'
                        )
                        self.stdout.write(
                            f'   收藏: {article.favorite_count} → {favorite_count}'
                        )
                        self.stdout.write(
                            f'   评论: {article.comment_count} → {comment_count}'
                        )

                        if not dry_run:
                            with transaction.atomic():
                                article.like_count = like_count
                                article.favorite_count = favorite_count
                                article.comment_count = comment_count
                                
                                # 如果阅读时长为空，重新计算
                                if not article.reading_time:
                                    article.update_reading_time()
                                
                                article.save(update_fields=[
                                    'like_count', 'favorite_count', 'comment_count', 'reading_time'
                                ])
                            
                            self.stdout.write(
                                self.style.SUCCESS(f'   ✅ 已更新')
                            )
                        
                        updated_count += 1

                except Exception as e:
                    error_count += 1
                    self.stdout.write(
                        self.style.ERROR(f'❌ 处理文章 [{article.id}] 时出错: {str(e)}')
                    )

            # 显示进度
            processed = min(i + batch_size, total_articles)
            self.stdout.write(f'📈 进度: {processed}/{total_articles}')

        # 显示最终结果
        self.stdout.write('\n' + '='*50)
        if dry_run:
            self.stdout.write(
                self.style.WARNING(f'🔍 DRY RUN 完成：发现 {updated_count} 篇文章需要更新')
            )
        else:
            self.stdout.write(
                self.style.SUCCESS(f'✅ 同步完成：更新了 {updated_count} 篇文章')
            )
        
        if error_count > 0:
            self.stdout.write(
                self.style.ERROR(f'❌ 错误: {error_count} 篇文章处理失败')
            )

        self.stdout.write('📊 统计数据同步完成！')
