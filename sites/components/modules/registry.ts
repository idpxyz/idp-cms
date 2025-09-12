"use client";

import React from "react";
import type { ModuleKey, ModuleRegistryItem } from "./types";
import QuickTicker from "../../app/portal/components/QuickTickerModule";
import MostRead from "../../app/portal/components/MostReadModule";
import RegionSwitcher from "../../app/portal/components/RegionSwitcherModule";
import StrategyBar from "../../app/portal/components/StrategyBarModule";
import TodayHeadlines from "../../app/portal/components/TodayHeadlinesModule";
import EditorsChoice from "../../app/portal/components/EditorsChoiceModule";
import TopSplitHeadlines from "../../app/portal/components/TopSplitHeadlinesModule";

const registry: Record<ModuleKey, ModuleRegistryItem> = {
  "quick-ticker": { key: "quick-ticker", Component: QuickTicker },
  "most-read": { key: "most-read", Component: MostRead },
  "region-switcher": { key: "region-switcher", Component: RegionSwitcher },
  "strategy-bar": { key: "strategy-bar", Component: StrategyBar },
  "today-headlines": { key: "today-headlines", Component: TodayHeadlines },
  "editors-choice": { key: "editors-choice", Component: EditorsChoice },
  "top-split-headlines": { key: "top-split-headlines", Component: TopSplitHeadlines },
};

export default registry;


