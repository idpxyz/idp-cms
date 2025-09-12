import React from "react";

interface Channel {
  id: string;
  name: string;
  slug: string;
  description?: string;
  icon?: string;
  color?: string;
}

interface ChannelsProps {
  title?: string;
  channels: Channel[];
  variant?: "horizontal" | "vertical" | "dropdown";
}

export default function Channels({
  title = "新闻频道",
  channels,
  variant = "horizontal",
}: ChannelsProps) {
  if (variant === "vertical") {
    return (
      <section className="py-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">{title}</h2>
        <div className="space-y-2">
          {channels.map((channel) => (
            <a
              key={channel.id}
              href={`/channels/${channel.slug}`}
              className="flex items-center p-3 rounded-lg hover:bg-gray-50 transition-colors duration-200 group"
            >
              {channel.icon && (
                <div
                  className="w-8 h-8 rounded-lg mr-3 flex items-center justify-center"
                  style={{ backgroundColor: channel.color || "#3b82f6" }}
                >
                  <span className="text-white text-sm font-medium">
                    {channel.icon}
                  </span>
                </div>
              )}
              <div className="flex-1">
                <h3 className="font-medium text-gray-900 group-hover:text-blue-600">
                  {channel.name}
                </h3>
                {channel.description && (
                  <p className="text-sm text-gray-500 mt-1">
                    {channel.description}
                  </p>
                )}
              </div>
              <svg
                className="w-5 h-5 text-gray-400 group-hover:text-blue-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </a>
          ))}
        </div>
      </section>
    );
  }

  if (variant === "dropdown") {
    return (
      <section className="py-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">{title}</h2>
        <div className="relative group">
          <button className="flex items-center justify-between w-full px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
            <span>选择频道</span>
            <svg
              className="w-5 h-5 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </button>

          <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
            <div className="py-1">
              {channels.map((channel) => (
                <a
                  key={channel.id}
                  href={`/channels/${channel.slug}`}
                  className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                >
                  {channel.name}
                </a>
              ))}
            </div>
          </div>
        </div>
      </section>
    );
  }

  // Default horizontal variant
  return (
    <section className="py-8">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">{title}</h2>
      <div className="flex flex-wrap gap-4">
        {channels.map((channel) => (
          <a
            key={channel.id}
            href={`/channels/${channel.slug}`}
            className="flex items-center px-4 py-2 bg-white border border-gray-200 rounded-lg hover:border-blue-300 hover:shadow-md transition-all duration-200 group"
          >
            {channel.icon && (
              <div
                className="w-6 h-6 rounded mr-2 flex items-center justify-center"
                style={{ backgroundColor: channel.color || "#3b82f6" }}
              >
                <span className="text-white text-xs font-medium">
                  {channel.icon}
                </span>
              </div>
            )}
            <span className="font-medium text-gray-700 group-hover:text-blue-600">
              {channel.name}
            </span>
          </a>
        ))}
      </div>
    </section>
  );
}
