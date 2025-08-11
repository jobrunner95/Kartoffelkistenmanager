import { createClient } from '@supabase/supabase-js';

// --- TYPE DEFINITIONS ---
export interface TraitDefinition {
  name: string;
  options: string[];
}

export interface BoxData {
  id: number;
  varieties?: string[];
  sorting?: string;
  date?: string; // YYYY-MM-DD
  fillLevel?: string;
  customTraits?: { [traitName: string]: string };
}

export interface AppData {
  boxes: BoxData[];
  varieties: string[];
  sortings: string[];
  fillLevels: string[];
  customTraits: TraitDefinition[];
}

export interface Database {
  public: {
    Tables: {
      app_storage: {
        Row: {
          id: number;
          data: AppData | null;
          updated_at: string | null;
        };
        Insert: {
          id: number;
          data?: AppData | null;
          updated_at?: string | null;
        };
        Update: {
          id?: number;
          data?: AppData | null;
          updated_at?: string | null;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}

const supabaseUrl = 'https://wwiwuxmnholpzzghgcgk.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind3aXd1eG1uaG9scHp6Z2hnY2drIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ4NDU3MzksImV4cCI6MjA3MDQyMTczOX0.7TL-HZc8GlSO_d7P1eu9ZsXExiXMJtmLyDcySLJuPUA';

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);