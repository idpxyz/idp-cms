import React from "react";

type SectionElement = "section" | "div" | "main";

interface SectionProps {
  as?: SectionElement;
  children: React.ReactNode;
  className?: string;
  space?: "none" | "sm" | "md" | "lg";
}

const spaceClass: Record<NonNullable<SectionProps["space"]>, string> = {
  none: "",
  sm: "my-3",
  md: "my-4",
  lg: "my-6",
};

export default function Section({
  as = "section",
  children,
  className = "",
  space = "md",
}: SectionProps) {
  const Component = as as any;
  const cls = `${spaceClass[space]} ${className}`.trim();
  return <Component className={cls}>{children}</Component>;
}


