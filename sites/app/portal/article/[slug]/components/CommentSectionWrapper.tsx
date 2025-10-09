"use client";

import React, { useState, useEffect, useRef } from "react";
import dynamic from "next/dynamic";

const CommentSection = dynamic(() => import("../CommentSection"), {
  loading: () => (
    <div className="flex items-center justify-center py-12">
      <div className="text-gray-500">加载评论中...</div>
    </div>
  ),
});

interface CommentSectionWrapperProps {
  articleId: string;
}

/**
 * 评论区包装器 - 客户端组件
 * 管理评论数量状态 + 懒加载优化
 */
export default function CommentSectionWrapper({ articleId }: CommentSectionWrapperProps) {
  const [commentCount, setCommentCount] = useState(0);
  const [shouldLoadComments, setShouldLoadComments] = useState(false);
  const commentSectionRef = useRef<HTMLDivElement>(null);

  // ✅ 优化：使用 Intersection Observer 懒加载评论系统
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setShouldLoadComments(true);
          observer.disconnect(); // 一旦触发就断开观察
        }
      },
      {
        rootMargin: '200px', // 提前 200px 开始加载
      }
    );

    if (commentSectionRef.current) {
      observer.observe(commentSectionRef.current);
    }

    return () => {
      observer.disconnect();
    };
  }, []);

  return (
    <div ref={commentSectionRef}>
      {shouldLoadComments ? (
        <CommentSection
          articleId={articleId}
          commentCount={commentCount}
          onCommentCountChange={setCommentCount}
        />
      ) : (
        <div className="flex items-center justify-center py-12 text-gray-400">
          <div>滚动以查看评论...</div>
        </div>
      )}
    </div>
  );
}

