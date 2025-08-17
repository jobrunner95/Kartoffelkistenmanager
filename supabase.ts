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
          data: any;
          updated_at: string | null;
        };
        Insert: {
          id: number;
          data?: any;
          updated_at?: string | null;
        };
        Update: {
          id?: number;
          data?: any;
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

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Supabase URL und Anon Key sind nicht konfiguriert. Bitte setzen Sie die VITE_SUPABASE_URL und VITE_SUPABASE_ANON_KEY Umgebungsvariablen.");
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);