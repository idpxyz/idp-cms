"use client";

import React from "react";
import type { ModuleKey, ModuleRegistryItem } from "./types";
import MostRead from "../../app/portal/components/MostReadModule";
import RegionSwitcher from "../../app/portal/components/RegionSwitcherModule";
import StrategyBar from "../../app/portal/components/StrategyBarModule";
import TopStoriesGrid from "../../app/portal/components/TopStoriesGrid";
import EditorsChoice from "../../app/portal/components/EditorsChoiceModule";
import { getTopStoriesDefaultHours } from "../../lib/config/content-timing";

// 今日头条模块包装器 - 使用现代TopStoriesGrid
const TodayHeadlinesWrapper = () => (
  <TopStoriesGrid 
    autoFetch={true}
    fetchLimit={8}
    fetchOptions={{ 
      hours: getTopStoriesDefaultHours(), // 🎯 使用集中化配置
      diversity: 'high' 
    }}
    title="今日头条"
    showViewMore={true}
    viewMoreLink="/portal/news"
  />
);

const registry: Record<ModuleKey, ModuleRegistryItem> = {
  "most-read": { key: "most-read", Component: MostRead },
  "region-switcher": { key: "region-switcher", Component: RegionSwitcher },
  "strategy-bar": { key: "strategy-bar", Component: StrategyBar },
  "today-headlines": { key: "today-headlines", Component: TodayHeadlinesWrapper },
  "editors-choice": { key: "editors-choice", Component: EditorsChoice },
};

export default registry;
