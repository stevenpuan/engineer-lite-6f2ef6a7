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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      activity_logs: {
        Row: {
          action: string
          created_at: string
          detail: Json | null
          entity_id: string | null
          entity_type: string | null
          id: string
          tenant_id: string
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          detail?: Json | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          tenant_id: string
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          detail?: Json | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          tenant_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "activity_logs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          address: string | null
          contact_name: string | null
          created_at: string
          email: string | null
          id: string
          name: string
          notes: string | null
          phone: string | null
          tax_id: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          contact_name?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name: string
          notes?: string | null
          phone?: string | null
          tax_id?: string | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          contact_name?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          notes?: string | null
          phone?: string | null
          tax_id?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "clients_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      expenses: {
        Row: {
          amount: number
          category: string
          created_at: string
          description: string
          expense_date: string
          id: string
          is_overhead: boolean
          notes: string | null
          ocr: Json | null
          payment_method: string | null
          photo_path: string | null
          project_id: string | null
          receipt_no: string | null
          seller_tax_id: string | null
          status: string
          tenant_id: string
          updated_at: string
          vendor_name: string | null
        }
        Insert: {
          amount: number
          category?: string
          created_at?: string
          description: string
          expense_date?: string
          id?: string
          is_overhead?: boolean
          notes?: string | null
          ocr?: Json | null
          payment_method?: string | null
          photo_path?: string | null
          project_id?: string | null
          receipt_no?: string | null
          seller_tax_id?: string | null
          status?: string
          tenant_id: string
          updated_at?: string
          vendor_name?: string | null
        }
        Update: {
          amount?: number
          category?: string
          created_at?: string
          description?: string
          expense_date?: string
          id?: string
          is_overhead?: boolean
          notes?: string | null
          ocr?: Json | null
          payment_method?: string | null
          photo_path?: string | null
          project_id?: string | null
          receipt_no?: string | null
          seller_tax_id?: string | null
          status?: string
          tenant_id?: string
          updated_at?: string
          vendor_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "expenses_project_same_tenant"
            columns: ["project_id", "tenant_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id", "tenant_id"]
          },
          {
            foreignKeyName: "expenses_project_same_tenant"
            columns: ["project_id", "tenant_id"]
            isOneToOne: false
            referencedRelation: "v_project_finance_summary"
            referencedColumns: ["project_id", "tenant_id"]
          },
          {
            foreignKeyName: "expenses_project_same_tenant"
            columns: ["project_id", "tenant_id"]
            isOneToOne: false
            referencedRelation: "v_project_progress"
            referencedColumns: ["project_id", "tenant_id"]
          },
          {
            foreignKeyName: "expenses_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      line_bindings: {
        Row: {
          bind_code: string | null
          bound_at: string | null
          code_expires_at: string | null
          created_at: string
          id: string
          line_display_name: string | null
          line_user_id: string | null
          tenant_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          bind_code?: string | null
          bound_at?: string | null
          code_expires_at?: string | null
          created_at?: string
          id?: string
          line_display_name?: string | null
          line_user_id?: string | null
          tenant_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          bind_code?: string | null
          bound_at?: string | null
          code_expires_at?: string | null
          created_at?: string
          id?: string
          line_display_name?: string | null
          line_user_id?: string | null
          tenant_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "line_bindings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      line_events: {
        Row: {
          created_at: string
          event_type: string | null
          id: number
          line_user_id: string | null
          payload: Json | null
          tenant_id: string | null
        }
        Insert: {
          created_at?: string
          event_type?: string | null
          id?: never
          line_user_id?: string | null
          payload?: Json | null
          tenant_id?: string | null
        }
        Update: {
          created_at?: string
          event_type?: string | null
          id?: never
          line_user_id?: string | null
          payload?: Json | null
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "line_events_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      line_pending: {
        Row: {
          data: Json
          expires_at: string
          kind: string
          line_user_id: string
          tenant_id: string
        }
        Insert: {
          data?: Json
          expires_at?: string
          kind: string
          line_user_id: string
          tenant_id: string
        }
        Update: {
          data?: Json
          expires_at?: string
          kind?: string
          line_user_id?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "line_pending_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      modules: {
        Row: {
          description: string | null
          key: string
          name: string
          sort_order: number
          tier: string
        }
        Insert: {
          description?: string | null
          key: string
          name: string
          sort_order?: number
          tier: string
        }
        Update: {
          description?: string | null
          key?: string
          name?: string
          sort_order?: number
          tier?: string
        }
        Relationships: []
      }
      payables: {
        Row: {
          amount: number
          created_at: string
          description: string | null
          due_date: string | null
          id: string
          notes: string | null
          project_id: string | null
          status: string
          tenant_id: string
          updated_at: string
          vendor_name: string
        }
        Insert: {
          amount?: number
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          notes?: string | null
          project_id?: string | null
          status?: string
          tenant_id: string
          updated_at?: string
          vendor_name: string
        }
        Update: {
          amount?: number
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          notes?: string | null
          project_id?: string | null
          status?: string
          tenant_id?: string
          updated_at?: string
          vendor_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "payables_project_same_tenant"
            columns: ["project_id", "tenant_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id", "tenant_id"]
          },
          {
            foreignKeyName: "payables_project_same_tenant"
            columns: ["project_id", "tenant_id"]
            isOneToOne: false
            referencedRelation: "v_project_finance_summary"
            referencedColumns: ["project_id", "tenant_id"]
          },
          {
            foreignKeyName: "payables_project_same_tenant"
            columns: ["project_id", "tenant_id"]
            isOneToOne: false
            referencedRelation: "v_project_progress"
            referencedColumns: ["project_id", "tenant_id"]
          },
          {
            foreignKeyName: "payables_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          created_at: string
          id: string
          method: string | null
          notes: string | null
          paid_date: string
          payable_id: string
          reference_no: string | null
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          method?: string | null
          notes?: string | null
          paid_date?: string
          payable_id: string
          reference_no?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          method?: string | null
          notes?: string | null
          paid_date?: string
          payable_id?: string
          reference_no?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_payable_id_fkey"
            columns: ["payable_id"]
            isOneToOne: false
            referencedRelation: "payables"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_admins: {
        Row: {
          created_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          user_id?: string
        }
        Relationships: []
      }
      price_book: {
        Row: {
          created_at: string
          id: string
          last_used_at: string
          name: string
          tenant_id: string
          unit: string | null
          unit_price: number
          updated_at: string
          use_count: number
        }
        Insert: {
          created_at?: string
          id?: string
          last_used_at?: string
          name: string
          tenant_id: string
          unit?: string | null
          unit_price?: number
          updated_at?: string
          use_count?: number
        }
        Update: {
          created_at?: string
          id?: string
          last_used_at?: string
          name?: string
          tenant_id?: string
          unit?: string | null
          unit_price?: number
          updated_at?: string
          use_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "price_book_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string | null
          email: string | null
          id: string
          is_active: boolean
          role: string
          tenant_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          email?: string | null
          id?: string
          is_active?: boolean
          role?: string
          tenant_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          email?: string | null
          id?: string
          is_active?: boolean
          role?: string
          tenant_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      progress_logs: {
        Row: {
          created_at: string
          id: string
          log_date: string
          note: string | null
          percent: number
          project_id: string
          reported_by: string | null
          source: string
          stage_id: string
          tenant_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          log_date?: string
          note?: string | null
          percent: number
          project_id: string
          reported_by?: string | null
          source?: string
          stage_id: string
          tenant_id: string
        }
        Update: {
          created_at?: string
          id?: string
          log_date?: string
          note?: string | null
          percent?: number
          project_id?: string
          reported_by?: string | null
          source?: string
          stage_id?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "progress_logs_project_same_tenant"
            columns: ["project_id", "tenant_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id", "tenant_id"]
          },
          {
            foreignKeyName: "progress_logs_project_same_tenant"
            columns: ["project_id", "tenant_id"]
            isOneToOne: false
            referencedRelation: "v_project_finance_summary"
            referencedColumns: ["project_id", "tenant_id"]
          },
          {
            foreignKeyName: "progress_logs_project_same_tenant"
            columns: ["project_id", "tenant_id"]
            isOneToOne: false
            referencedRelation: "v_project_progress"
            referencedColumns: ["project_id", "tenant_id"]
          },
          {
            foreignKeyName: "progress_logs_stage_same_tenant"
            columns: ["stage_id", "tenant_id"]
            isOneToOne: false
            referencedRelation: "project_stages"
            referencedColumns: ["id", "tenant_id"]
          },
          {
            foreignKeyName: "progress_logs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      project_stages: {
        Row: {
          created_at: string
          due_date: string | null
          id: string
          name: string
          percent: number
          project_id: string
          sort_order: number
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          due_date?: string | null
          id?: string
          name: string
          percent?: number
          project_id: string
          sort_order?: number
          tenant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          due_date?: string | null
          id?: string
          name?: string
          percent?: number
          project_id?: string
          sort_order?: number
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_stages_project_same_tenant"
            columns: ["project_id", "tenant_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id", "tenant_id"]
          },
          {
            foreignKeyName: "project_stages_project_same_tenant"
            columns: ["project_id", "tenant_id"]
            isOneToOne: false
            referencedRelation: "v_project_finance_summary"
            referencedColumns: ["project_id", "tenant_id"]
          },
          {
            foreignKeyName: "project_stages_project_same_tenant"
            columns: ["project_id", "tenant_id"]
            isOneToOne: false
            referencedRelation: "v_project_progress"
            referencedColumns: ["project_id", "tenant_id"]
          },
          {
            foreignKeyName: "project_stages_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          address: string | null
          client_id: string | null
          contract_amount: number | null
          created_at: string
          end_date: string | null
          id: string
          name: string
          notes: string | null
          start_date: string | null
          status: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          client_id?: string | null
          contract_amount?: number | null
          created_at?: string
          end_date?: string | null
          id?: string
          name: string
          notes?: string | null
          start_date?: string | null
          status?: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          client_id?: string | null
          contract_amount?: number | null
          created_at?: string
          end_date?: string | null
          id?: string
          name?: string
          notes?: string | null
          start_date?: string | null
          status?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "projects_client_same_tenant"
            columns: ["client_id", "tenant_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id", "tenant_id"]
          },
          {
            foreignKeyName: "projects_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      quote_items: {
        Row: {
          amount: number
          created_at: string
          description: string
          id: string
          notes: string | null
          quantity: number
          quote_id: string
          sort_order: number
          unit: string | null
          unit_price: number
        }
        Insert: {
          amount?: number
          created_at?: string
          description: string
          id?: string
          notes?: string | null
          quantity?: number
          quote_id: string
          sort_order?: number
          unit?: string | null
          unit_price?: number
        }
        Update: {
          amount?: number
          created_at?: string
          description?: string
          id?: string
          notes?: string | null
          quantity?: number
          quote_id?: string
          sort_order?: number
          unit?: string | null
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "quote_items_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
        ]
      }
      quotes: {
        Row: {
          created_at: string
          id: string
          is_latest: boolean
          notes: string | null
          parent_quote_id: string | null
          project_id: string
          quote_date: string
          quote_no: string | null
          status: string
          subtotal: number
          tax: number
          tax_rate: number
          tenant_id: string
          title: string
          total: number
          updated_at: string
          valid_until: string | null
          version: number
        }
        Insert: {
          created_at?: string
          id?: string
          is_latest?: boolean
          notes?: string | null
          parent_quote_id?: string | null
          project_id: string
          quote_date?: string
          quote_no?: string | null
          status?: string
          subtotal?: number
          tax?: number
          tax_rate?: number
          tenant_id: string
          title: string
          total?: number
          updated_at?: string
          valid_until?: string | null
          version?: number
        }
        Update: {
          created_at?: string
          id?: string
          is_latest?: boolean
          notes?: string | null
          parent_quote_id?: string | null
          project_id?: string
          quote_date?: string
          quote_no?: string | null
          status?: string
          subtotal?: number
          tax?: number
          tax_rate?: number
          tenant_id?: string
          title?: string
          total?: number
          updated_at?: string
          valid_until?: string | null
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "quotes_parent_quote_id_fkey"
            columns: ["parent_quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotes_project_same_tenant"
            columns: ["project_id", "tenant_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id", "tenant_id"]
          },
          {
            foreignKeyName: "quotes_project_same_tenant"
            columns: ["project_id", "tenant_id"]
            isOneToOne: false
            referencedRelation: "v_project_finance_summary"
            referencedColumns: ["project_id", "tenant_id"]
          },
          {
            foreignKeyName: "quotes_project_same_tenant"
            columns: ["project_id", "tenant_id"]
            isOneToOne: false
            referencedRelation: "v_project_progress"
            referencedColumns: ["project_id", "tenant_id"]
          },
          {
            foreignKeyName: "quotes_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      receipts: {
        Row: {
          amount: number
          created_at: string
          id: string
          method: string | null
          notes: string | null
          receivable_id: string
          received_date: string
          reference_no: string | null
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          method?: string | null
          notes?: string | null
          receivable_id: string
          received_date?: string
          reference_no?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          method?: string | null
          notes?: string | null
          receivable_id?: string
          received_date?: string
          reference_no?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "receipts_receivable_id_fkey"
            columns: ["receivable_id"]
            isOneToOne: false
            referencedRelation: "receivables"
            referencedColumns: ["id"]
          },
        ]
      }
      receivables: {
        Row: {
          amount: number
          created_at: string
          due_date: string | null
          id: string
          label: string
          notes: string | null
          project_id: string
          status: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          amount?: number
          created_at?: string
          due_date?: string | null
          id?: string
          label: string
          notes?: string | null
          project_id: string
          status?: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          due_date?: string | null
          id?: string
          label?: string
          notes?: string | null
          project_id?: string
          status?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "receivables_project_same_tenant"
            columns: ["project_id", "tenant_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id", "tenant_id"]
          },
          {
            foreignKeyName: "receivables_project_same_tenant"
            columns: ["project_id", "tenant_id"]
            isOneToOne: false
            referencedRelation: "v_project_finance_summary"
            referencedColumns: ["project_id", "tenant_id"]
          },
          {
            foreignKeyName: "receivables_project_same_tenant"
            columns: ["project_id", "tenant_id"]
            isOneToOne: false
            referencedRelation: "v_project_progress"
            referencedColumns: ["project_id", "tenant_id"]
          },
          {
            foreignKeyName: "receivables_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      stage_templates: {
        Row: {
          created_at: string
          id: string
          name: string
          sort_order: number
          stages: Json
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          sort_order?: number
          stages?: Json
          tenant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          sort_order?: number
          stages?: Json
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "stage_templates_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tax_invoices: {
        Row: {
          buyer_tax_id: string | null
          counterparty_name: string | null
          counterparty_tax_id: string | null
          created_at: string
          deduct_note: string | null
          deductible: boolean | null
          direction: string
          expense_id: string | null
          id: string
          invoice_date: string
          invoice_no: string | null
          notes: string | null
          payable_id: string | null
          period_key: number | null
          photo_path: string | null
          project_id: string | null
          receivable_id: string | null
          sales_amount: number
          source: string
          status: string
          tax_amount: number
          tax_type: string
          tenant_id: string
          total_amount: number | null
          updated_at: string
        }
        Insert: {
          buyer_tax_id?: string | null
          counterparty_name?: string | null
          counterparty_tax_id?: string | null
          created_at?: string
          deduct_note?: string | null
          deductible?: boolean | null
          direction: string
          expense_id?: string | null
          id?: string
          invoice_date?: string
          invoice_no?: string | null
          notes?: string | null
          payable_id?: string | null
          period_key?: number | null
          photo_path?: string | null
          project_id?: string | null
          receivable_id?: string | null
          sales_amount: number
          source?: string
          status?: string
          tax_amount?: number
          tax_type?: string
          tenant_id: string
          total_amount?: number | null
          updated_at?: string
        }
        Update: {
          buyer_tax_id?: string | null
          counterparty_name?: string | null
          counterparty_tax_id?: string | null
          created_at?: string
          deduct_note?: string | null
          deductible?: boolean | null
          direction?: string
          expense_id?: string | null
          id?: string
          invoice_date?: string
          invoice_no?: string | null
          notes?: string | null
          payable_id?: string | null
          period_key?: number | null
          photo_path?: string | null
          project_id?: string | null
          receivable_id?: string | null
          sales_amount?: number
          source?: string
          status?: string
          tax_amount?: number
          tax_type?: string
          tenant_id?: string
          total_amount?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tax_invoices_expense_same_tenant"
            columns: ["expense_id", "tenant_id"]
            isOneToOne: false
            referencedRelation: "expenses"
            referencedColumns: ["id", "tenant_id"]
          },
          {
            foreignKeyName: "tax_invoices_payable_same_tenant"
            columns: ["payable_id", "tenant_id"]
            isOneToOne: false
            referencedRelation: "payables"
            referencedColumns: ["id", "tenant_id"]
          },
          {
            foreignKeyName: "tax_invoices_project_same_tenant"
            columns: ["project_id", "tenant_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id", "tenant_id"]
          },
          {
            foreignKeyName: "tax_invoices_project_same_tenant"
            columns: ["project_id", "tenant_id"]
            isOneToOne: false
            referencedRelation: "v_project_finance_summary"
            referencedColumns: ["project_id", "tenant_id"]
          },
          {
            foreignKeyName: "tax_invoices_project_same_tenant"
            columns: ["project_id", "tenant_id"]
            isOneToOne: false
            referencedRelation: "v_project_progress"
            referencedColumns: ["project_id", "tenant_id"]
          },
          {
            foreignKeyName: "tax_invoices_receivable_same_tenant"
            columns: ["receivable_id", "tenant_id"]
            isOneToOne: false
            referencedRelation: "receivables"
            referencedColumns: ["id", "tenant_id"]
          },
          {
            foreignKeyName: "tax_invoices_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_modules: {
        Row: {
          enabled: boolean
          enabled_at: string | null
          module_key: string
          note: string | null
          tenant_id: string
        }
        Insert: {
          enabled?: boolean
          enabled_at?: string | null
          module_key: string
          note?: string | null
          tenant_id: string
        }
        Update: {
          enabled?: boolean
          enabled_at?: string | null
          module_key?: string
          note?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_modules_module_key_fkey"
            columns: ["module_key"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["key"]
          },
          {
            foreignKeyName: "tenant_modules_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenants: {
        Row: {
          created_at: string
          display_name: string | null
          id: string
          industry: string
          max_users: number | null
          name: string
          notes: string | null
          status: string
          tax_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          id?: string
          industry?: string
          max_users?: number | null
          name: string
          notes?: string | null
          status?: string
          tax_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          id?: string
          industry?: string
          max_users?: number | null
          name?: string
          notes?: string | null
          status?: string
          tax_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      v_project_finance_summary: {
        Row: {
          contract_amount: number | null
          expense_total: number | null
          paid_total: number | null
          payable_total: number | null
          project_id: string | null
          project_name: string | null
          project_status: string | null
          quote_count: number | null
          quote_total: number | null
          receivable_total: number | null
          received_total: number | null
          tenant_id: string | null
        }
        Insert: {
          contract_amount?: number | null
          expense_total?: never
          paid_total?: never
          payable_total?: never
          project_id?: string | null
          project_name?: string | null
          project_status?: string | null
          quote_count?: never
          quote_total?: never
          receivable_total?: never
          received_total?: never
          tenant_id?: string | null
        }
        Update: {
          contract_amount?: number | null
          expense_total?: never
          paid_total?: never
          payable_total?: never
          project_id?: string | null
          project_name?: string | null
          project_status?: string | null
          quote_count?: never
          quote_total?: never
          receivable_total?: never
          received_total?: never
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "projects_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      v_project_progress: {
        Row: {
          last_report_at: string | null
          overall_percent: number | null
          project_id: string | null
          stage_count: number | null
          tenant_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "projects_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      _line_issue_code: { Args: { _uid: string }; Returns: Json }
      _line_members: {
        Args: { _tenant: string }
        Returns: {
          bind_code: string
          bound_at: string
          code_expires_at: string
          display_name: string
          email: string
          is_active: boolean
          line_display_name: string
          role: string
          user_id: string
        }[]
      }
      _line_unbind: { Args: { _uid: string }; Returns: undefined }
      _team_check_limit: { Args: { _t: string }; Returns: undefined }
      _team_guard: { Args: { _uid: string }; Returns: string }
      current_tenant_id: { Args: never; Returns: string }
      has_module: { Args: { _key: string }; Returns: boolean }
      is_platform_admin: { Args: { _uid?: string }; Returns: boolean }
      is_tenant_owner: { Args: never; Returns: boolean }
      line_bind: {
        Args: { _code: string; _display_name: string; _line_user_id: string }
        Returns: Json
      }
      line_create_expense: {
        Args: {
          _amount: number
          _category: string
          _description: string
          _expense_date?: string
          _line_user_id: string
          _ocr?: Json
          _photo_path: string
          _project_id: string
          _receipt_no?: string
          _seller_tax_id?: string
          _vendor_name?: string
        }
        Returns: Json
      }
      line_ctx: {
        Args: { _line_user_id: string }
        Returns: {
          display_name: string
          role: string
          tenant_id: string
          tenant_name: string
          user_id: string
        }[]
      }
      line_daily_digest: {
        Args: never
        Returns: {
          data: Json
          line_user_id: string
          tenant_id: string
        }[]
      }
      line_find_receipt: {
        Args: { _line_user_id: string; _receipt_no: string }
        Returns: Json
      }
      line_has_module: {
        Args: { _key: string; _line_user_id: string }
        Returns: boolean
      }
      line_money_summary: { Args: { _line_user_id: string }; Returns: Json }
      line_pending_clear: {
        Args: { _line_user_id: string }
        Returns: undefined
      }
      line_pending_get: {
        Args: { _line_user_id: string }
        Returns: {
          data: Json
          kind: string
        }[]
      }
      line_pending_set: {
        Args: { _data: Json; _kind: string; _line_user_id: string }
        Returns: undefined
      }
      line_project_by_id: {
        Args: { _line_user_id: string; _project_id: string }
        Returns: {
          id: string
          name: string
        }[]
      }
      line_projects: {
        Args: { _limit?: number; _line_user_id: string; _q?: string }
        Returns: {
          client_name: string
          id: string
          last_report_at: string
          my_recent: boolean
          name: string
          overall_percent: number
          status: string
          total: number
        }[]
      }
      line_report_progress: {
        Args: { _line_user_id: string; _percent: number; _stage_id: string }
        Returns: Json
      }
      line_stages: {
        Args: { _line_user_id: string; _project_id: string }
        Returns: {
          id: string
          name: string
          percent: number
          project_name: string
        }[]
      }
      mark_overdue_receivables: { Args: never; Returns: number }
      pa_create_tenant: {
        Args: {
          _display_name?: string
          _industry?: string
          _name: string
          _notes?: string
          _tax_id?: string
        }
        Returns: string
      }
      pa_create_user: {
        Args: {
          _display_name?: string
          _email: string
          _password: string
          _role?: string
          _tenant_id: string
        }
        Returns: string
      }
      pa_line_issue_code: { Args: { _user_id: string }; Returns: Json }
      pa_line_members: {
        Args: { _tenant_id: string }
        Returns: {
          bind_code: string
          bound_at: string
          code_expires_at: string
          display_name: string
          email: string
          is_active: boolean
          line_display_name: string
          role: string
          user_id: string
        }[]
      }
      pa_line_unbind: { Args: { _user_id: string }; Returns: undefined }
      pa_set_max_users: {
        Args: { _max: number; _tenant_id: string }
        Returns: undefined
      }
      pa_tenant_list: {
        Args: never
        Returns: {
          created_at: string
          display_name: string
          id: string
          industry: string
          module_count: number
          name: string
          notes: string
          status: string
          tax_id: string
          updated_at: string
          user_count: number
        }[]
      }
      pa_tenant_modules: {
        Args: { _tenant_id: string }
        Returns: {
          enabled: boolean
          enabled_at: string
          module_key: string
          module_name: string
          note: string
          sort_order: number
          tier: string
        }[]
      }
      pa_tenant_users: {
        Args: { _tenant_id: string }
        Returns: {
          created_at: string
          display_name: string
          email: string
          is_active: boolean
          role: string
          user_id: string
        }[]
      }
      pa_toggle_module: {
        Args: { _enabled: boolean; _module_key: string; _tenant_id: string }
        Returns: undefined
      }
      pa_toggle_user_active: {
        Args: { _active: boolean; _user_id: string }
        Returns: undefined
      }
      pa_update_tenant: {
        Args: {
          _display_name?: string
          _id: string
          _industry?: string
          _name?: string
          _notes?: string
          _status?: string
          _tax_id?: string
        }
        Returns: undefined
      }
      pa_update_user_role: {
        Args: { _role: string; _user_id: string }
        Returns: undefined
      }
      purge_line_data: { Args: never; Returns: undefined }
      purge_old_logs: { Args: never; Returns: undefined }
      recalc_quote_totals: { Args: { _quote_id: string }; Returns: undefined }
      receivable_status_for: {
        Args: {
          _amount: number
          _due: string
          _received: number
          _status: string
        }
        Returns: string
      }
      rpc_apply_stage_template: {
        Args: { _project_id: string; _template_id: string }
        Returns: number
      }
      rpc_dashboard_month: { Args: never; Returns: Json }
      rpc_dashboard_totals: { Args: never; Returns: Json }
      rpc_line_issue_code: { Args: { _user_id: string }; Returns: Json }
      rpc_line_members: {
        Args: never
        Returns: {
          bind_code: string
          bound_at: string
          code_expires_at: string
          display_name: string
          email: string
          is_active: boolean
          line_display_name: string
          role: string
          user_id: string
        }[]
      }
      rpc_line_new_bind_code: { Args: never; Returns: string }
      rpc_line_unbind: { Args: never; Returns: undefined }
      rpc_line_unbind_member: { Args: { _user_id: string }; Returns: undefined }
      rpc_my_tenant_tax_id: { Args: never; Returns: string }
      rpc_price_book_remember: {
        Args: { _name: string; _unit: string; _unit_price: number }
        Returns: undefined
      }
      rpc_quote_new_version: { Args: { _quote_id: string }; Returns: string }
      rpc_report_progress: {
        Args: {
          _note?: string
          _percent: number
          _source?: string
          _stage_id: string
        }
        Returns: {
          created_at: string
          id: string
          log_date: string
          note: string | null
          percent: number
          project_id: string
          reported_by: string | null
          source: string
          stage_id: string
          tenant_id: string
        }
        SetofOptions: {
          from: "*"
          to: "progress_logs"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      rpc_tax_import_expenses: { Args: never; Returns: number }
      rpc_tax_summary: { Args: { _year: number }; Returns: Json }
      rpc_team_create_user: {
        Args: {
          _display_name?: string
          _email: string
          _password: string
          _role?: string
        }
        Returns: string
      }
      rpc_team_info: { Args: never; Returns: Json }
      rpc_team_reset_password: {
        Args: { _password: string; _user_id: string }
        Returns: undefined
      }
      rpc_team_set_active: {
        Args: { _active: boolean; _user_id: string }
        Returns: undefined
      }
      rpc_team_set_role: {
        Args: { _role: string; _user_id: string }
        Returns: undefined
      }
      seed_stage_templates: { Args: { _tenant_id: string }; Returns: undefined }
      tax_default_deductible: {
        Args: { _buyer_tax_id: string; _category: string; _tenant: string }
        Returns: {
          deductible: boolean
          note: string
        }[]
      }
      tenant_has_module: {
        Args: { _key: string; _tenant: string }
        Returns: boolean
      }
      verify_cron_secret: { Args: { _secret: string }; Returns: boolean }
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
  public: {
    Enums: {},
  },
} as const
