"use client";
import React from "react";

export default function StrategyBarModule({
  strategy,
  userType,
  confidence,
  description,
}: {
  strategy?: string;
  userType?: string;
  confidence?: number;
  description?: string;
}) {
  // 隐藏推荐策略信息栏 - 不在生产环境显示
  return null;
}


