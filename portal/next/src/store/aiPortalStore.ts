import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { AITool, AINews, AICategory, AIToolCategory, SearchFilters, User } from '@/types/ai';

interface AIPortalState {
  // User state
  user: User | null;
  isAuthenticated: boolean;
  
  // AI Tools data
  aiTools: AITool[];
  categories: AICategory[];
  searchResults: AITool[];
  
  // AI News data
  aiNews: AINews[];
  hotNews: AINews[];
  
  // Search and filters
  searchFilters: SearchFilters;
  currentCategory: string | null;
  
  // UI state
  isLoading: boolean;
  currentView: 'home' | 'tools' | 'news' | 'tutorials' | 'profile';
  
  // Actions
  setUser: (user: User) => void;
  logout: () => void;
  setAITools: (tools: AITool[]) => void;
  setCategories: (categories: AICategory[]) => void;
  setAINews: (news: AINews[]) => void;
  setSearchFilters: (filters: SearchFilters) => void;
  setSearchResults: (results: AITool[]) => void;
  setCurrentCategory: (category: string | null) => void;
  setLoading: (loading: boolean) => void;
  setCurrentView: (view: AIPortalState['currentView']) => void;
  
  // Computed values
  getToolsByCategory: (category: AIToolCategory) => AITool[];
  getHotTools: () => AITool[];
  getNewTools: () => AITool[];
  getNewsByCategory: (category: string) => AINews[];
  getHotNews: () => AINews[];
}

export const useAIPortalStore = create<AIPortalState>()(
  persist(
    (set, get) => ({
      // Initial state
      user: null,
      isAuthenticated: false,
      aiTools: [],
      categories: [],
      searchResults: [],
      aiNews: [],
      hotNews: [],
      searchFilters: {},
      currentCategory: null,
      isLoading: false,
      currentView: 'home',
      
      // Actions
      setUser: (user) => set({ user, isAuthenticated: true }),
      
      logout: () => set({ user: null, isAuthenticated: false }),
      
      setAITools: (tools) => set({ aiTools: tools }),
      
      setCategories: (categories) => set({ categories }),
      
      setAINews: (news) => set({ aiNews: news }),
      
      setSearchFilters: (filters) => set({ searchFilters: filters }),
      
      setSearchResults: (results) => set({ searchResults: results }),
      
      setCurrentCategory: (category) => set({ currentCategory: category }),
      
      setLoading: (loading) => set({ isLoading: loading }),
      
      setCurrentView: (view) => set({ currentView: view }),
      
      // Computed values
      getToolsByCategory: (category) => {
        const { aiTools } = get();
        return aiTools.filter(tool => tool.category === category);
      },
      
      getHotTools: () => {
        const { aiTools } = get();
        return aiTools
          .filter(tool => tool.isHot)
          .sort((a, b) => b.usageCount - a.usageCount)
          .slice(0, 8);
      },
      
      getNewTools: () => {
        const { aiTools } = get();
        return aiTools
          .filter(tool => tool.isNew)
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
          .slice(0, 6);
      },
      
      getNewsByCategory: (category) => {
        const { aiNews } = get();
        return aiNews.filter(news => news.category === category);
      },
      
      getHotNews: () => {
        const { aiNews } = get();
        return aiNews
          .filter(news => news.isHot)
          .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())
          .slice(0, 5);
      },
    }),
    {
      name: 'ai-portal-storage',
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
        searchFilters: state.searchFilters,
        currentCategory: state.currentCategory,
      }),
    }
  )
);
