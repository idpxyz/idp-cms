/**
 * Magazine 杂志横幅组件
 */

import React from "react";

interface MagazineHeroProps {
  headline?: string;
  subheadline?: string;
  author?: string;
  publishDate?: string;
  image?: string;
}

export default function MagazineHero({
  headline = "Featured Story",
  subheadline = "An in-depth look at the story behind the headlines",
  author = "Editorial Team",
  publishDate = "January 2024",
  image,
}: MagazineHeroProps) {
  return (
    <div className="relative mb-8">
      {image && (
        <div
          className="h-96 bg-cover bg-center rounded-lg"
          style={{ backgroundImage: `url(${image})` }}
        />
      )}
      <div
        className={`${image ? "absolute bottom-0 left-0 right-0 bg-black bg-opacity-70 text-white p-8 rounded-b-lg" : "p-8"}`}
      >
        <h1 className="text-4xl font-serif font-bold mb-4">{headline}</h1>
        <p className="text-xl mb-4 opacity-90">{subheadline}</p>
        <div className="flex items-center gap-4 text-sm">
          <span>By {author}</span>
          <span>•</span>
          <time>{publishDate}</time>
        </div>
      </div>
    </div>
  );
}
