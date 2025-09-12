import React from "react";

type ContainerElement = "div" | "main" | "section" | "header" | "footer";

interface PageContainerProps {
  as?: ContainerElement;
  children: React.ReactNode;
  className?: string;
  padding?: "none" | "sm" | "md" | "lg";
}

const paddingClass: Record<NonNullable<PageContainerProps["padding"]>, string> = {
  none: "",
  sm: "px-3",
  md: "px-4",
  lg: "px-6",
};

export default function PageContainer({
  as = "div",
  children,
  className = "",
  padding = "md",
}: PageContainerProps) {
  const Component = as as any;
  const paddingCls = paddingClass[padding];
  return (
    <Component className={`max-w-7xl mx-auto ${paddingCls} ${className}`.trim()}>
      {children}
    </Component>
  );
}


