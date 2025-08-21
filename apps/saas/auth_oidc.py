import os
from django.contrib.auth import get_user_model
from mozilla_django_oidc.auth import OIDCAuthenticationBackend
from apps.saas.models import Tenant, TenantMember
from apps.rbac.models import Role, RoleBinding

User = get_user_model()

class CustomOIDCBackend(OIDCAuthenticationBackend):
    def filter_users_by_claims(self, claims):
        email = claims.get("email"); 
        return self.UserModel.objects.filter(email__iexact=email) if email else self.UserModel.objects.none()

    def create_user(self, claims):
        email = claims.get("email") or claims.get("preferred_username") or claims.get("sub")
        username = email or claims.get("sub")
        user = self.UserModel.objects.create_user(username=username, email=email)
        self._update_user_fields(user, claims, first=True); return user

    def update_user(self, user, claims):
        self._update_user_fields(user, claims, first=False); return user

    def _update_user_fields(self, user, claims, first: bool):
        user.first_name = (claims.get("given_name") or "")[:150]
        user.last_name = (claims.get("family_name") or "")[:150]
        staff_domain = os.getenv("OIDC_STAFF_EMAIL_DOMAIN","").strip()
        if staff_domain and user.email and user.email.lower().endswith("@"+staff_domain.lower()):
            user.is_staff = True
        user.save()
        try: self._map_organizations(user, claims)
        except Exception: pass

    def _map_organizations(self, user, claims):
        orgs = claims.get("organizations") or []
        for org in orgs:
            hostname = None
            if isinstance(org, dict):
                meta = (org.get("metadata") or {})
                hostname = meta.get("hostname") or org.get("name")
            elif isinstance(org, str):
                hostname = org
            if not hostname: continue
            tenant = Tenant.objects.filter(site__hostname=hostname).select_related("site").first()
            if not tenant: continue
            TenantMember.objects.get_or_create(tenant=tenant, user=user, defaults={"role":"viewer"})
            role_name = os.getenv("OIDC_DEFAULT_ROLE","").strip() or None
            if role_name:
                role = Role.objects.filter(tenant=tenant, name=role_name).first()
                if role:
                    RoleBinding.objects.get_or_create(tenant=tenant, role=role, user=user, site=tenant.site, channel="", page_root=None)
