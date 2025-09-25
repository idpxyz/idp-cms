"""
Web用户系统的序列化器
用于API数据序列化和验证
"""
from rest_framework import serializers
from django.contrib.auth.hashers import make_password
from .models import WebUser, UserProfile, ReadingHistory, UserComment, UserFavorite, UserInteraction


class WebUserSerializer(serializers.ModelSerializer):
    """WebUser序列化器"""
    
    password = serializers.CharField(write_only=True, min_length=6)
    confirm_password = serializers.CharField(write_only=True)
    
    class Meta:
        model = WebUser
        fields = [
            'id', 'username', 'email', 'nickname', 'avatar', 'bio',
            'is_active', 'is_verified', 'date_joined', 'last_login',
            'password', 'confirm_password'
        ]
        read_only_fields = ['id', 'date_joined', 'last_login', 'is_verified']
        extra_kwargs = {
            'password': {'write_only': True},
            'password_hash': {'write_only': True},
        }
    
    def validate(self, attrs):
        """验证密码一致性"""
        if 'password' in attrs and 'confirm_password' in attrs:
            if attrs['password'] != attrs['confirm_password']:
                raise serializers.ValidationError("密码不一致")
        return attrs
    
    def create(self, validated_data):
        """创建用户时加密密码"""
        password = validated_data.pop('password')
        validated_data.pop('confirm_password', None)
        
        user = WebUser(**validated_data)
        user.set_password(password)
        user.save()
        
        # 创建用户档案
        UserProfile.objects.create(user=user)
        
        return user
    
    def update(self, instance, validated_data):
        """更新用户信息"""
        password = validated_data.pop('password', None)
        validated_data.pop('confirm_password', None)
        
        if password:
            instance.set_password(password)
        
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        
        instance.save()
        return instance


class UserProfileSerializer(serializers.ModelSerializer):
    """用户档案序列化器"""
    
    class Meta:
        model = UserProfile
        fields = [
            'birth_date', 'location', 'phone', 'preferred_channels', 
            'preferred_categories', 'articles_read', 'comments_count', 
            'favorites_count'
        ]
        read_only_fields = ['articles_read', 'comments_count', 'favorites_count']


class UserLoginSerializer(serializers.Serializer):
    """用户登录序列化器"""
    
    username = serializers.CharField()
    password = serializers.CharField()


class UserRegisterSerializer(serializers.ModelSerializer):
    """用户注册序列化器"""
    
    password = serializers.CharField(write_only=True, min_length=6)
    confirm_password = serializers.CharField(write_only=True)
    
    class Meta:
        model = WebUser
        fields = ['username', 'email', 'nickname', 'password', 'confirm_password']
    
    def validate_username(self, value):
        """验证用户名唯一性"""
        if WebUser.objects.filter(username=value).exists():
            raise serializers.ValidationError("用户名已存在")
        return value
    
    def validate_email(self, value):
        """验证邮箱唯一性"""
        if WebUser.objects.filter(email=value).exists():
            raise serializers.ValidationError("邮箱已被注册")
        return value
    
    def validate(self, attrs):
        """验证密码一致性"""
        if attrs['password'] != attrs['confirm_password']:
            raise serializers.ValidationError("密码不一致")
        return attrs
    
    def create(self, validated_data):
        """创建新用户"""
        validated_data.pop('confirm_password')
        password = validated_data.pop('password')
        
        user = WebUser(**validated_data)
        user.set_password(password)
        user.save()
        
        # 创建用户档案
        UserProfile.objects.create(user=user)
        
        return user


class ReadingHistorySerializer(serializers.ModelSerializer):
    """阅读历史序列化器"""
    
    class Meta:
        model = ReadingHistory
        fields = [
            'id', 'article_id', 'article_title', 'article_slug', 
            'article_channel', 'read_time', 'read_duration', 'read_progress'
        ]
        read_only_fields = ['id', 'read_time']


class UserCommentSerializer(serializers.ModelSerializer):
    """用户评论序列化器"""
    
    user_info = serializers.SerializerMethodField()
    is_liked = serializers.BooleanField(read_only=True, default=False)  # 动态添加的点赞状态字段
    
    class Meta:
        model = UserComment
        fields = [
            'id', 'article_id', 'article_title', 'article_slug', 'article_channel',
            'content', 'parent', 'parent_content', 'parent_author', 
            'status', 'likes', 'created_at', 'updated_at', 'user_info', 'is_liked'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'status', 'likes', 'is_liked']
    
    def get_user_info(self, obj):
        """获取用户信息"""
        return {
            'username': obj.user.username,
            'nickname': obj.user.nickname or obj.user.username,
            'avatar': obj.user.avatar,
        }


class UserFavoriteSerializer(serializers.ModelSerializer):
    """用户收藏序列化器"""
    
    class Meta:
        model = UserFavorite
        fields = [
            'id', 'article_id', 'article_title', 'article_slug', 'article_channel',
            'article_excerpt', 'article_image_url', 'article_publish_time', 'created_at'
        ]
        read_only_fields = ['id', 'created_at']


class UserInteractionSerializer(serializers.ModelSerializer):
    """用户互动序列化器"""
    
    class Meta:
        model = UserInteraction
        fields = [
            'id', 'target_type', 'target_id', 'interaction_type', 'created_at'
        ]
        read_only_fields = ['id', 'created_at']


class UserStatsSerializer(serializers.Serializer):
    """用户统计信息序列化器"""
    
    articles_read = serializers.IntegerField()
    comments_count = serializers.IntegerField() 
    favorites_count = serializers.IntegerField()
    total_read_time = serializers.IntegerField()  # 分钟
    recent_activity = serializers.IntegerField()  # 最近7天活动
    favorite_channel = serializers.CharField()


class PasswordChangeSerializer(serializers.Serializer):
    """密码修改序列化器"""
    
    old_password = serializers.CharField()
    new_password = serializers.CharField(min_length=6)
    confirm_password = serializers.CharField()
    
    def validate(self, attrs):
        """验证新密码一致性"""
        if attrs['new_password'] != attrs['confirm_password']:
            raise serializers.ValidationError("新密码不一致")
        return attrs
    
    def validate_old_password(self, value):
        """验证旧密码"""
        user = self.context['request'].user
        if not user.check_password(value):
            raise serializers.ValidationError("旧密码错误")
        return value
