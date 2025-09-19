"""
网站前端用户认证API

提供用户注册、登录、登出等认证功能
与Wagtail后台用户系统完全独立
"""
from datetime import datetime, timedelta
from django.conf import settings
from django.contrib.auth.hashers import check_password
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from apps.web_users.models import WebUser
from apps.web_users.serializers import (
    UserLoginSerializer, UserRegisterSerializer, WebUserSerializer,
    PasswordChangeSerializer
)


# JWT配置
JWT_SECRET = getattr(settings, 'SECRET_KEY', 'your-secret-key')
JWT_ALGORITHM = 'HS256'
JWT_EXPIRATION_HOURS = 24 * 7  # 7天


def generate_jwt_token(user):
    """生成JWT token"""
    import jwt  # 延迟导入避免Celery启动问题
    payload = {
        'user_id': user.id,
        'username': user.username,
        'email': user.email,
        'exp': datetime.utcnow() + timedelta(hours=JWT_EXPIRATION_HOURS),
        'iat': datetime.utcnow(),
    }
    token = jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)
    return token


def decode_jwt_token(token):
    """解码JWT token"""
    import jwt  # 延迟导入避免Celery启动问题
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError:
        return None


def get_user_from_token(request):
    """从请求中获取用户"""
    auth_header = request.META.get('HTTP_AUTHORIZATION')
    if not auth_header or not auth_header.startswith('Bearer '):
        return None
    
    token = auth_header.split(' ')[1]
    payload = decode_jwt_token(token)
    if not payload:
        return None
    
    try:
        user = WebUser.objects.get(id=payload['user_id'], is_active=True)
        return user
    except WebUser.DoesNotExist:
        return None


@api_view(['POST'])
@permission_classes([AllowAny])
def register(request):
    """用户注册"""
    serializer = UserRegisterSerializer(data=request.data)
    
    if serializer.is_valid():
        user = serializer.save()
        
        # 生成JWT token
        token = generate_jwt_token(user)
        
        # 更新最后登录时间
        user.update_last_login()
        
        return Response({
            'success': True,
            'message': '注册成功',
            'token': token,
            'user': WebUserSerializer(user).data
        }, status=status.HTTP_201_CREATED)
    
    return Response({
        'success': False,
        'message': '注册失败',
        'errors': serializer.errors
    }, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([AllowAny])
def login(request):
    """用户登录"""
    serializer = UserLoginSerializer(data=request.data)
    
    if serializer.is_valid():
        username = serializer.validated_data['username']
        password = serializer.validated_data['password']
        
        try:
            # 支持用户名或邮箱登录
            if '@' in username:
                user = WebUser.objects.get(email=username, is_active=True)
            else:
                user = WebUser.objects.get(username=username, is_active=True)
            
            # 验证密码
            if user.check_password(password):
                # 生成JWT token
                token = generate_jwt_token(user)
                
                # 更新最后登录时间
                user.update_last_login()
                
                return Response({
                    'success': True,
                    'message': '登录成功',
                    'token': token,
                    'user': WebUserSerializer(user).data
                }, status=status.HTTP_200_OK)
            else:
                return Response({
                    'success': False,
                    'message': '用户名或密码错误'
                }, status=status.HTTP_401_UNAUTHORIZED)
                
        except WebUser.DoesNotExist:
            return Response({
                'success': False,
                'message': '用户名或密码错误'
            }, status=status.HTTP_401_UNAUTHORIZED)
    
    return Response({
        'success': False,
        'message': '请求数据无效',
        'errors': serializer.errors
    }, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
def logout(request):
    """用户登出"""
    # JWT是无状态的，客户端删除token即可
    # 这里可以添加token黑名单逻辑（可选）
    
    return Response({
        'success': True,
        'message': '登出成功'
    }, status=status.HTTP_200_OK)


@api_view(['GET'])
def profile(request):
    """获取用户个人信息"""
    user = get_user_from_token(request)
    if not user:
        return Response({
            'success': False,
            'message': '未登录或token无效'
        }, status=status.HTTP_401_UNAUTHORIZED)
    
    return Response({
        'success': True,
        'user': WebUserSerializer(user).data
    }, status=status.HTTP_200_OK)


@api_view(['PUT'])
def update_profile(request):
    """更新用户个人信息"""
    user = get_user_from_token(request)
    if not user:
        return Response({
            'success': False,
            'message': '未登录或token无效'
        }, status=status.HTTP_401_UNAUTHORIZED)
    
    # 不允许更新密码和关键字段
    excluded_fields = ['password', 'password_hash', 'username', 'email', 'is_active', 'is_verified']
    data = {k: v for k, v in request.data.items() if k not in excluded_fields}
    
    serializer = WebUserSerializer(user, data=data, partial=True)
    
    if serializer.is_valid():
        serializer.save()
        return Response({
            'success': True,
            'message': '个人信息更新成功',
            'user': serializer.data
        }, status=status.HTTP_200_OK)
    
    return Response({
        'success': False,
        'message': '更新失败',
        'errors': serializer.errors
    }, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
def change_password(request):
    """修改密码"""
    user = get_user_from_token(request)
    if not user:
        return Response({
            'success': False,
            'message': '未登录或token无效'
        }, status=status.HTTP_401_UNAUTHORIZED)
    
    serializer = PasswordChangeSerializer(data=request.data, context={'request': request})
    
    if serializer.is_valid():
        # 设置新密码
        user.set_password(serializer.validated_data['new_password'])
        user.save()
        
        return Response({
            'success': True,
            'message': '密码修改成功'
        }, status=status.HTTP_200_OK)
    
    return Response({
        'success': False,
        'message': '密码修改失败',
        'errors': serializer.errors
    }, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET'])
def verify_token(request):
    """验证token有效性"""
    user = get_user_from_token(request)
    if user:
        return Response({
            'success': True,
            'valid': True,
            'user': WebUserSerializer(user).data
        }, status=status.HTTP_200_OK)
    
    return Response({
        'success': False,
        'valid': False,
        'message': 'Token无效或已过期'
    }, status=status.HTTP_401_UNAUTHORIZED)


@api_view(['POST'])
def refresh_token(request):
    """刷新token"""
    user = get_user_from_token(request)
    if not user:
        return Response({
            'success': False,
            'message': '未登录或token无效'
        }, status=status.HTTP_401_UNAUTHORIZED)
    
    # 生成新的token
    new_token = generate_jwt_token(user)
    
    return Response({
        'success': True,
        'message': 'Token刷新成功',
        'token': new_token,
        'user': WebUserSerializer(user).data
    }, status=status.HTTP_200_OK)
