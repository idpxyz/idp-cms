export type ModuleKey =
  | "most-read"
  | "region-switcher"
  | "strategy-bar"
  | "today-headlines"
  | "editors-choice";

export interface ModuleConfigItem {
  key: ModuleKey | string;
  variant?: string;
  region?: string;
  props?: Record<string, any>;
}

export interface ModuleRegistryItem {
  key: ModuleKey;
  Component: React.ComponentType<any>;
  defaultProps?: Record<string, any>;
}


