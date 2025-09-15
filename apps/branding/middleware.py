from django.utils.deprecation import MiddlewareMixin

class AdminRememberMeMiddleware(MiddlewareMixin):
    """Optional: enable 'remember me' checkbox on admin login.

    If the login form (admin) posts with remember_me checked, persist session
    (e.g., 14 days). Otherwise keep it browser-session only.
    Wire it in settings.MIDDLEWARE after authentication middleware.
    """
    def process_response(self, request, response):
        try:
            if request.path.endswith("/admin/login/") and request.method == "POST":
                if request.POST.get("remember_me"):
                    # 14 days
                    request.session.set_expiry(60 * 60 * 24 * 14)
                else:
                    request.session.set_expiry(0)
        except Exception:
            # be silent; never break login flow
            pass
        return response
