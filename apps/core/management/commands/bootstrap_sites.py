from django.core.management.base import BaseCommand, CommandError
from django.core.management import call_command

def parse_domain(domain: str):
    if not domain:
        return None, None
    d = domain.strip().lower()
    if d.startswith("http://") or d.startswith("https://") or "/" in d:
        raise CommandError(f"Invalid domain '{domain}': do not include protocol or path")
    if ":" in d:
        host, port = d.split(":", 1)
        if not port.isdigit():
            raise CommandError(f"Invalid port in '{domain}'")
        return host, int(port)
    return d, None

class Command(BaseCommand):
    help = (
        "Bootstrap sites for local dev or demos.\n"
        "- Default: Portal + two tenant sites (A/B) when --a-domain & --b-domain provided.\n"
        "- --single: Portal + one tenant site (--site-domain or --a-domain).\n"
        "- --portal-only: Only create Portal site.\n"
        "Admin email/password options apply to ALL created sites; if omitted, email falls back to admin@<host>, "
        "password falls back to 'Passw0rd!' (not for production)."
    )

    def add_arguments(self, parser):
        parser.add_argument("--portal-domain", required=True, help="Host[:port] for Portal, e.g. portal.local:8000")
        parser.add_argument("--portal-name", default="Portal", help="Display name for the Portal site (default: Portal)")

        # Multi / single modes
        parser.add_argument("--a-domain", help="Host[:port] for tenant site A (multi-site)")
        parser.add_argument("--b-domain", help="Host[:port] for tenant site B (multi-site)")
        parser.add_argument("--single", action="store_true", help="Create only one tenant site plus Portal")
        parser.add_argument("--site-domain", help="Host[:port] for the single tenant site (single mode). If omitted, falls back to --a-domain")
        parser.add_argument("--portal-only", action="store_true", help="Create only the Portal site and exit")

        # Admin credentials (applies to all created sites)
        parser.add_argument("--admin-email", default=None, help="Admin email for created sites; default admin@<host>")
        parser.add_argument("--admin-password", default=None, help="Admin password; default 'Passw0rd!' (NOT for production)")

        # Misc
        parser.add_argument("--name", default="News", help="Display name prefix for tenant sites (default: News)")
        parser.add_argument("--default", action="store_true", help="Mark the first created site as the Wagtail default site")

    def handle(self, *args, **opts):
        portal_host, portal_port = parse_domain(opts["portal_domain"])
        portal_name = opts["portal_name"]
        portal_only = opts["portal_only"]
        single = opts["single"]
        a_domain = opts.get("site_domain") or opts.get("a_domain")
        b_domain = opts.get("b_domain")
        name = opts["name"]
        admin_email = opts.get("admin_email")
        admin_password = opts.get("admin_password") or "Passw0rd!"

        if portal_only:
            created = []
            self._mk_site(portal_host, portal_port, portal_name, admin_email, admin_password, is_default=opts["default"], created=created)
            self._print_result(created); return

        if single:
            if not a_domain:
                raise CommandError("In --single mode you must provide --site-domain or --a-domain")
        else:
            if not (a_domain and b_domain):
                raise CommandError("Provide both --a-domain and --b-domain for multi-site mode (or use --single / --portal-only)")

        created = []
        self._mk_site(portal_host, portal_port, portal_name, admin_email, admin_password, is_default=opts["default"], created=created)

        if single:
            self._mk_by_domain(a_domain, name, admin_email, admin_password, created=created)
        else:
            self._mk_by_domain(a_domain, f"{name} A", admin_email, admin_password, created=created)
            self._mk_by_domain(b_domain, f"{name} B", admin_email, admin_password, created=created)

        self._print_result(created)

    def _mk_by_domain(self, domain_str, display_name, admin_email, admin_password, *, created):
        host, port = parse_domain(domain_str)
        self._mk_site(host, port, display_name, admin_email, admin_password, created=created)

    def _mk_site(self, host, port, display_name, admin_email, admin_password, *, created, is_default=False):
        email = admin_email or f"admin@{host}"
        self.stdout.write(self.style.NOTICE(f"Creating site: {display_name} ({host}:{port or 'auto'})"))
        call_command(
            "add_site",
            "--host", host,
            *(["--port", str(port)] if port else []),
            "--name", display_name,
            "--admin-email", email,
            "--admin-password", admin_password,
            *(["--default"] if is_default and not created else []),
        )
        created.append((display_name, host, port))

    def _print_result(self, created):
        self.stdout.write("")
        self.stdout.write(self.style.SUCCESS("Bootstrap complete."))
        for n, h, p in created:
            self.stdout.write(f"- {n}: http://{h}{(':'+str(p)) if p else ''}")
        if created:
            self.stdout.write("")
            self.stdout.write("Tips: add entries to /etc/hosts for local dev, e.g.:")
            all_hosts = " ".join([h for _, h, _ in created])
            self.stdout.write(f"  127.0.0.1 {all_hosts}")
