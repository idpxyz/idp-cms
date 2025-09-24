"""
Django管理命令：验证环境变量配置
"""

from django.core.management.base import BaseCommand, CommandError
from config.env_validator import EnvValidator, validate_environment, EnvironmentError


class Command(BaseCommand):
    help = '验证环境变量配置'

    def add_arguments(self, parser):
        parser.add_argument(
            '--strict',
            action='store_true',
            help='严格模式：有任何警告都会失败',
        )
        parser.add_argument(
            '--detailed',
            action='store_true',
            help='显示详细的验证报告',
        )
        parser.add_argument(
            '--quiet',
            action='store_true',
            help='静默模式：只在失败时输出',
        )

    def handle(self, *args, **options):
        strict = options['strict']
        detailed = options['detailed']
        quiet = options['quiet']

        try:
            if not quiet:
                self.stdout.write("🔍 正在验证环境变量配置...")
                self.stdout.write("")

            # 执行验证
            result = validate_environment(strict=strict, detailed=detailed or not quiet)

            if result:
                if not quiet:
                    self.stdout.write(
                        self.style.SUCCESS("✅ 环境变量验证通过！")
                    )

        except EnvironmentError as e:
            self.stderr.write(
                self.style.ERROR(f"❌ 环境变量验证失败: {e}")
            )
            raise CommandError(f"环境变量验证失败: {e}")

        except Exception as e:
            self.stderr.write(
                self.style.ERROR(f"❌ 验证过程中发生错误: {e}")
            )
            raise CommandError(f"验证过程中发生错误: {e}")

        # 如果用户要求详细输出，显示环境配置摘要
        if detailed and not quiet:
            self.stdout.write("")
            self.stdout.write("📊 环境配置摘要:")
            debug_info = EnvValidator.validate_all()
            summary = debug_info['summary']
            
            self.stdout.write(f"  环境: {summary['environment']}")
            self.stdout.write(f"  已设置的变量数: {summary['total_vars_set']}")
            self.stdout.write(f"  必需变量数: {summary['required_vars_count']}")
            self.stdout.write(f"  缺失变量数: {summary['missing_count']}")
            self.stdout.write(f"  警告数: {summary['warnings_count']}")
            self.stdout.write(f"  错误数: {summary['errors_count']}")

        # 显示当前使用的关键URL配置
        if not quiet:
            self.stdout.write("")
            self.stdout.write("🔗 关键URL配置:")
            self.stdout.write(f"  CMS Origin: {EnvValidator.get_str('CMS_ORIGIN', 'not set')}")
            self.stdout.write(f"  CMS Public URL: {EnvValidator.get_str('CMS_PUBLIC_URL', 'not set')}")
            self.stdout.write(f"  Frontend Origin: {EnvValidator.get_str('FRONTEND_ORIGIN', 'not set')}")
            self.stdout.write(f"  Redis URL: {EnvValidator.get_str('REDIS_URL', 'not set')}")
            self.stdout.write(f"  Database: {EnvValidator.get_str('POSTGRES_DB', 'not set')}")
