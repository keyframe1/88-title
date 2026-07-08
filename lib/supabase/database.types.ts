/**
 * Hand-written Supabase `Database` type for the dealer-portal tables.
 *
 * Shaped to match what `supabase gen types typescript` would emit (Row / Insert /
 * Update / Relationships per table; empty Views & Functions via the `never`
 * idiom) so it satisfies postgrest-js's `GenericSchema` constraint. Wiring this
 * into createServerClient<Database> / createBrowserClient<Database> makes every
 * `.from(...).select()/insert()/update()` fully typed — no `any` in app code.
 *
 * Regenerate (once the Supabase CLI is linked) with:
 *   supabase gen types typescript --linked > lib/supabase/database.types.ts
 * and drop this hand-written version.
 */
import type {
  Dealer,
  DealerStatus,
  DealerTransaction,
  StaffUser,
  TransactionStatus,
} from "@/lib/dealers/types";
import type {
  Checkin,
  CheckinCheckedItems,
  CheckinQueueRow,
  CheckinReadiness,
  CheckinStatus,
  CheckinStatusView,
  PushSubscriptionJSON,
} from "@/lib/checkin/types";
import type { OmvReferenceRow } from "@/lib/omv/types";
import type { TaxRateRow } from "@/lib/tax/types";
import type { Customer, CustomerIdType, Vehicle } from "@/lib/records/types";
import type {
  Transaction,
  TransactionServiceFee,
  TransactionStatus as TxnStatus,
} from "@/lib/transactions/types";
import type {
  ActivityDetail,
  ActivityEntityType,
  ActivityLog,
} from "@/lib/activity/types";

/** Standard Supabase JSON scalar (matches what `gen types` emits). */
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      dealers: {
        Row: Dealer;
        Insert: {
          id?: string;
          created_at?: string;
          dealership_name: string;
          contact_name?: string | null;
          contact_email?: string | null;
          phone?: string | null;
          status?: DealerStatus;
          auth_user_id?: string | null;
        };
        Update: {
          id?: string;
          created_at?: string;
          dealership_name?: string;
          contact_name?: string | null;
          contact_email?: string | null;
          phone?: string | null;
          status?: DealerStatus;
          auth_user_id?: string | null;
        };
        Relationships: [];
      };
      dealer_transactions: {
        Row: DealerTransaction;
        Insert: {
          id?: string;
          dealer_id: string;
          created_at?: string;
          vehicle_description?: string | null;
          transaction_type?: string | null;
          status?: TransactionStatus;
          status_updated_at?: string;
          needs_attention?: boolean;
          attention_note?: string | null;
          stock_number?: string | null;
          vin?: string | null;
          vehicle_year?: number | null;
          vehicle_make?: string | null;
          vehicle_model?: string | null;
          notes?: string | null;
          customer_id?: string | null;
          vehicle_id?: string | null;
        };
        Update: {
          id?: string;
          dealer_id?: string;
          created_at?: string;
          vehicle_description?: string | null;
          transaction_type?: string | null;
          status?: TransactionStatus;
          status_updated_at?: string;
          needs_attention?: boolean;
          attention_note?: string | null;
          stock_number?: string | null;
          vin?: string | null;
          vehicle_year?: number | null;
          vehicle_make?: string | null;
          vehicle_model?: string | null;
          notes?: string | null;
          customer_id?: string | null;
          vehicle_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "dealer_transactions_dealer_id_fkey";
            columns: ["dealer_id"];
            isOneToOne: false;
            referencedRelation: "dealers";
            referencedColumns: ["id"];
          },
        ];
      };
      staff_users: {
        Row: StaffUser;
        Insert: {
          auth_user_id: string;
          created_at?: string;
          full_name?: string | null;
          role?: "staff" | "admin";
        };
        Update: {
          auth_user_id?: string;
          created_at?: string;
          full_name?: string | null;
          role?: "staff" | "admin";
        };
        Relationships: [];
      };
      checkins: {
        Row: Checkin;
        Insert: {
          id?: string;
          created_at?: string;
          name?: string | null;
          phone?: string | null;
          email?: string | null;
          service_type: string;
          status?: CheckinStatus;
          ticket_code?: string;
          session_token?: string;
          renewal_date?: string | null;
          marketing_consent?: boolean;
          push_subscription?: PushSubscriptionJSON | null;
          readiness?: CheckinReadiness | null;
          checked_items?: CheckinCheckedItems | null;
          customer_id?: string | null;
          vehicle_id?: string | null;
          arrived_at?: string | null;
        };
        Update: {
          id?: string;
          created_at?: string;
          name?: string | null;
          phone?: string | null;
          email?: string | null;
          service_type?: string;
          status?: CheckinStatus;
          ticket_code?: string;
          session_token?: string;
          renewal_date?: string | null;
          marketing_consent?: boolean;
          push_subscription?: PushSubscriptionJSON | null;
          readiness?: CheckinReadiness | null;
          checked_items?: CheckinCheckedItems | null;
          customer_id?: string | null;
          vehicle_id?: string | null;
          arrived_at?: string | null;
        };
        Relationships: [];
      };
      omv_reference: {
        Row: OmvReferenceRow;
        Insert: {
          id?: string;
          created_at?: string;
          updated_at?: string;
          transaction_slug: string;
          label: string;
          code?: string | null;
          note?: string | null;
          display_order?: number;
        };
        Update: {
          id?: string;
          created_at?: string;
          updated_at?: string;
          transaction_slug?: string;
          label?: string;
          code?: string | null;
          note?: string | null;
          display_order?: number;
        };
        Relationships: [];
      };
      tax_rates: {
        Row: TaxRateRow;
        Insert: {
          id?: string;
          created_at?: string;
          updated_at?: string;
          jurisdiction_level: "state" | "parish" | "district";
          jurisdiction_name: string;
          parent_jurisdiction?: string | null;
          rate: number;
          effective_date?: string;
          note?: string | null;
        };
        Update: {
          id?: string;
          created_at?: string;
          updated_at?: string;
          jurisdiction_level?: "state" | "parish" | "district";
          jurisdiction_name?: string;
          parent_jurisdiction?: string | null;
          rate?: number;
          effective_date?: string;
          note?: string | null;
        };
        Relationships: [];
      };
      customers: {
        Row: Customer;
        Insert: {
          id?: string;
          created_at?: string;
          updated_at?: string;
          full_name: string;
          phone?: string | null;
          email?: string | null;
          address_line1?: string | null;
          address_line2?: string | null;
          city?: string | null;
          state?: string;
          postal_code?: string | null;
          parish?: string | null;
          id_type?: CustomerIdType | null;
          id_number?: string | null;
          id_state?: string | null;
          date_of_birth?: string | null;
          notes?: string | null;
        };
        Update: {
          id?: string;
          created_at?: string;
          updated_at?: string;
          full_name?: string;
          phone?: string | null;
          email?: string | null;
          address_line1?: string | null;
          address_line2?: string | null;
          city?: string | null;
          state?: string;
          postal_code?: string | null;
          parish?: string | null;
          id_type?: CustomerIdType | null;
          id_number?: string | null;
          id_state?: string | null;
          date_of_birth?: string | null;
          notes?: string | null;
        };
        Relationships: [];
      };
      vehicles: {
        Row: Vehicle;
        Insert: {
          id?: string;
          created_at?: string;
          updated_at?: string;
          vin: string;
          year?: number | null;
          make?: string | null;
          model?: string | null;
          body_style?: string | null;
          color?: string | null;
          notes?: string | null;
        };
        Update: {
          id?: string;
          created_at?: string;
          updated_at?: string;
          vin?: string;
          year?: number | null;
          make?: string | null;
          model?: string | null;
          body_style?: string | null;
          color?: string | null;
          notes?: string | null;
        };
        Relationships: [];
      };
      transactions: {
        Row: Transaction;
        Insert: {
          id?: string;
          created_at?: string;
          processed_by: string;
          customer_id?: string | null;
          vehicle_id?: string | null;
          checkin_id?: string | null;
          service_type: string;
          status?: TxnStatus;
          sale_price_cents?: number | null;
          trade_in_cents?: number | null;
          rebate_cents?: number | null;
          taxable_amount_cents?: number | null;
          tax_cents?: number | null;
          parish?: string | null;
          service_fees?: TransactionServiceFee[];
          service_fee_total_cents?: number;
          statutory_tag_fee_cents?: number;
          total_collected_cents?: number;
          notes?: string | null;
          completed_at?: string | null;
          voided_at?: string | null;
          void_reason?: string | null;
        };
        Update: {
          id?: string;
          created_at?: string;
          processed_by?: string;
          customer_id?: string | null;
          vehicle_id?: string | null;
          checkin_id?: string | null;
          service_type?: string;
          status?: TxnStatus;
          sale_price_cents?: number | null;
          trade_in_cents?: number | null;
          rebate_cents?: number | null;
          taxable_amount_cents?: number | null;
          tax_cents?: number | null;
          parish?: string | null;
          service_fees?: TransactionServiceFee[];
          service_fee_total_cents?: number;
          statutory_tag_fee_cents?: number;
          total_collected_cents?: number;
          notes?: string | null;
          completed_at?: string | null;
          voided_at?: string | null;
          void_reason?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "transactions_customer_id_fkey";
            columns: ["customer_id"];
            isOneToOne: false;
            referencedRelation: "customers";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "transactions_vehicle_id_fkey";
            columns: ["vehicle_id"];
            isOneToOne: false;
            referencedRelation: "vehicles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "transactions_checkin_id_fkey";
            columns: ["checkin_id"];
            isOneToOne: false;
            referencedRelation: "checkins";
            referencedColumns: ["id"];
          },
        ];
      };
      activity_log: {
        Row: ActivityLog;
        // id is `generated always as identity` (never inserted); the log is
        // append-only, so the app never issues an UPDATE - the Update shape below
        // exists only to satisfy the GenericSchema constraint.
        Insert: {
          created_at?: string;
          actor: string;
          action: string;
          entity_type: ActivityEntityType;
          entity_id?: string | null;
          summary: string;
          detail?: ActivityDetail | null;
        };
        Update: {
          created_at?: string;
          actor?: string;
          action?: string;
          entity_type?: ActivityEntityType;
          entity_id?: string | null;
          summary?: string;
          detail?: ActivityDetail | null;
        };
        Relationships: [];
      };
    };
    Views: {
      checkin_queue: {
        Row: CheckinQueueRow;
        Relationships: [];
      };
    };
    Functions: {
      get_checkin: {
        Args: { p_token: string };
        Returns: CheckinStatusView[];
      };
      save_push_subscription: {
        Args: { p_token: string; p_subscription: Json };
        Returns: boolean;
      };
      cancel_checkin: {
        Args: { p_token: string };
        Returns: boolean;
      };
      set_arrived: {
        Args: { p_token: string };
        Returns: boolean;
      };
      gen_ticket_code: {
        Args: Record<PropertyKey, never>;
        Returns: string;
      };
      staff_display_names: {
        Args: { p_ids: string[] };
        Returns: { auth_user_id: string; display_name: string }[];
      };
      log_dealer_tx_filed: {
        Args: { p_transaction_id: string };
        Returns: undefined;
      };
    };
  };
};
