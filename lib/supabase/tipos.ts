export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.18"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      edicoes_lpc: {
        Row: {
          contagens: Json | null
          id: number
          periodo_fim: string
          periodo_inicio: string
          processada_em: string | null
          sha256: string
          status: string
          url: string
        }
        Insert: {
          contagens?: Json | null
          id?: never
          periodo_fim: string
          periodo_inicio: string
          processada_em?: string | null
          sha256: string
          status?: string
          url: string
        }
        Update: {
          contagens?: Json | null
          id?: never
          periodo_fim?: string
          periodo_inicio?: string
          processada_em?: string | null
          sha256?: string
          status?: string
          url?: string
        }
        Relationships: []
      }
      estado_fontes: {
        Row: {
          em_problema: boolean
          fonte: string
          problema_desde: string | null
          tipo_problema: string | null
          ultima_edicao_fim: string | null
          ultima_ok_em: string | null
        }
        Insert: {
          em_problema?: boolean
          fonte: string
          problema_desde?: string | null
          tipo_problema?: string | null
          ultima_edicao_fim?: string | null
          ultima_ok_em?: string | null
        }
        Update: {
          em_problema?: boolean
          fonte?: string
          problema_desde?: string | null
          tipo_problema?: string | null
          ultima_edicao_fim?: string | null
          ultima_ok_em?: string | null
        }
        Relationships: []
      }
      execucoes_sync: {
        Row: {
          contagens: Json | null
          detalhe: string | null
          fonte: string
          id: number
          iniciada_em: string
          resultado: string
          terminada_em: string | null
        }
        Insert: {
          contagens?: Json | null
          detalhe?: string | null
          fonte: string
          id?: never
          iniciada_em: string
          resultado: string
          terminada_em?: string | null
        }
        Update: {
          contagens?: Json | null
          detalhe?: string | null
          fonte?: string
          id?: never
          iniciada_em?: string
          resultado?: string
          terminada_em?: string | null
        }
        Relationships: []
      }
      links_lpc: {
        Row: {
          edicao_id: number
          resultado: string
          url: string
          visto_em: string
        }
        Insert: {
          edicao_id: number
          resultado: string
          url: string
          visto_em?: string
        }
        Update: {
          edicao_id?: number
          resultado?: string
          url?: string
          visto_em?: string
        }
        Relationships: [
          {
            foreignKeyName: "links_lpc_edicao_id_fkey"
            columns: ["edicao_id"]
            isOneToOne: false
            referencedRelation: "edicoes_lpc"
            referencedColumns: ["id"]
          },
        ]
      }
      postos: {
        Row: {
          acuracia_estimada: string | null
          ativo: boolean
          atualizado_em: string
          bairro: string | null
          bandeira: string | null
          cep: string | null
          cnpj: string
          desativado_em: string | null
          endereco: string
          lat: number | null
          lng: number | null
          localizacao: unknown
          municipio: string
          origem_localizacao: string | null
          razao_social: string
          uf: string
        }
        Insert: {
          acuracia_estimada?: string | null
          ativo?: boolean
          atualizado_em: string
          bairro?: string | null
          bandeira?: string | null
          cep?: string | null
          cnpj: string
          desativado_em?: string | null
          endereco: string
          lat?: number | null
          lng?: number | null
          localizacao?: unknown
          municipio: string
          origem_localizacao?: string | null
          razao_social: string
          uf: string
        }
        Update: {
          acuracia_estimada?: string | null
          ativo?: boolean
          atualizado_em?: string
          bairro?: string | null
          bandeira?: string | null
          cep?: string | null
          cnpj?: string
          desativado_em?: string | null
          endereco?: string
          lat?: number | null
          lng?: number | null
          localizacao?: unknown
          municipio?: string
          origem_localizacao?: string | null
          razao_social?: string
          uf?: string
        }
        Relationships: []
      }
      precos: {
        Row: {
          cnpj: string
          criado_em: string
          data_coleta: string
          edicao_id: number
          fonte: string
          preco: number
          produto: string
        }
        Insert: {
          cnpj: string
          criado_em?: string
          data_coleta: string
          edicao_id: number
          fonte: string
          preco: number
          produto: string
        }
        Update: {
          cnpj?: string
          criado_em?: string
          data_coleta?: string
          edicao_id?: number
          fonte?: string
          preco?: number
          produto?: string
        }
        Relationships: [
          {
            foreignKeyName: "precos_edicao_id_fkey"
            columns: ["edicao_id"]
            isOneToOne: false
            referencedRelation: "edicoes_lpc"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const
