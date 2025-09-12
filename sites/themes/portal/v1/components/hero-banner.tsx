/**
 * Portal 横幅组件
 */

import React from "react";

interface HeroBannerProps {
  title?: string;
  subtitle?: string;
  backgroundImage?: string;
}

export default function HeroBanner({
  title = "Welcome to Portal",
  subtitle = "Your gateway to news and information",
  backgroundImage,
}: HeroBannerProps) {
  return (
    <div
      className="relative h-64 bg-gradient-to-r from-blue-600 to-purple-600 flex items-center justify-center text-white"
      style={
        backgroundImage ? { backgroundImage: `url(${backgroundImage})` } : {}
      }
    >
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-2">{title}</h1>
        <p className="text-xl opacity-90">{subtitle}</p>
      </div>
    </div>
  );
}
