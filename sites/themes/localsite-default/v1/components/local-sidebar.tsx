/**
 * LocalSite 本地侧边栏组件
 */

import React from "react";

interface LocalSidebarProps {
  weatherData?: {
    temperature: string;
    condition: string;
  };
  upcomingEvents?: Array<{
    id: string;
    title: string;
    date: string;
  }>;
}

export default function LocalSidebar({
  weatherData,
  upcomingEvents = [],
}: LocalSidebarProps) {
  // Mock data
  const defaultWeather = {
    temperature: "22°C",
    condition: "Sunny",
  };

  const defaultEvents = [
    { id: "1", title: "City Council Meeting", date: "2024-01-05" },
    { id: "2", title: "Community BBQ", date: "2024-01-07" },
    { id: "3", title: "Library Book Sale", date: "2024-01-10" },
  ];

  const displayWeather = weatherData || defaultWeather;
  const displayEvents =
    upcomingEvents.length > 0 ? upcomingEvents : defaultEvents;

  return (
    <div className="space-y-6">
      {/* Weather Widget */}
      <div className="bg-blue-50 p-4 rounded-lg">
        <h3 className="font-bold text-blue-800 mb-2">Local Weather</h3>
        <div className="text-center">
          <div className="text-2xl font-bold text-blue-600">
            {displayWeather.temperature}
          </div>
          <div className="text-blue-600">{displayWeather.condition}</div>
        </div>
      </div>

      {/* Upcoming Events */}
      <div className="bg-green-50 p-4 rounded-lg">
        <h3 className="font-bold text-green-800 mb-3">Upcoming Events</h3>
        <div className="space-y-2">
          {displayEvents.map((event) => (
            <div key={event.id} className="text-sm">
              <div className="font-medium text-green-700">{event.title}</div>
              <div className="text-green-600">{event.date}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Links */}
      <div className="bg-gray-50 p-4 rounded-lg">
        <h3 className="font-bold text-gray-800 mb-3">Quick Links</h3>
        <ul className="space-y-1 text-sm">
          <li>
            <a href="#" className="text-blue-600 hover:underline">
              City Hall
            </a>
          </li>
          <li>
            <a href="#" className="text-blue-600 hover:underline">
              Emergency Services
            </a>
          </li>
          <li>
            <a href="#" className="text-blue-600 hover:underline">
              Public Transport
            </a>
          </li>
          <li>
            <a href="#" className="text-blue-600 hover:underline">
              Local Directory
            </a>
          </li>
        </ul>
      </div>
    </div>
  );
}
