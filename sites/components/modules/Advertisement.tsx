import React from "react";
import Image from "next/image";

interface AdvertisementProps {
  title?: string;
  variant?: "banner" | "sidebar" | "footer";
  size?: "small" | "medium" | "large";
  content?: string;
  image?: string;
  link?: string;
  className?: string;
}

export default function Advertisement({
  title = "广告位",
  variant = "banner",
  size = "medium",
  content,
  image,
  link,
  className = "",
}: AdvertisementProps) {
  const sizeClasses = {
    small: "w-48 h-48",
    medium: "w-64 h-64",
    large: "w-full h-32",
  };

  const variantClasses = {
    banner: "bg-gradient-to-r from-blue-500 to-purple-600 text-white",
    sidebar: "bg-gradient-to-r from-green-500 to-blue-600 text-white",
    footer: "bg-gradient-to-r from-gray-600 to-gray-800 text-white",
  };

  const renderContent = () => {
    if (image) {
      return (
        <Image
          src={image}
          alt={title}
          fill
          className="object-cover rounded-lg"
        />
      );
    }

    if (content) {
      return (
        <div className="text-center p-4">
          <h3 className="font-semibold mb-2">{title}</h3>
          <p className="text-sm opacity-90">{content}</p>
        </div>
      );
    }

    return (
      <div className="text-center p-4">
        <h3 className="font-semibold mb-2">{title}</h3>
        <p className="text-sm opacity-90">
          {variant === "banner" && "横幅广告位"}
          {variant === "sidebar" && "侧边栏广告位"}
          {variant === "footer" && "底部广告位"}
        </p>
        <p className="text-xs opacity-75 mt-2">
          {size === "small" && "300x300"}
          {size === "medium" && "300x250"}
          {size === "large" && "728x90"}
        </p>
      </div>
    );
  };

  const Wrapper = link ? "a" : "div";
  const wrapperProps = link
    ? { href: link, target: "_blank", rel: "noopener noreferrer" }
    : {};

  return (
    <Wrapper
      {...wrapperProps}
      className={`
        block rounded-lg shadow-md hover:shadow-lg transition-all duration-200 overflow-hidden
        ${variantClasses[variant]}
        ${sizeClasses[size]}
        ${className}
      `}
    >
      {renderContent()}
    </Wrapper>
  );
}
