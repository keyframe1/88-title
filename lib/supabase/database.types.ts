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
  CheckinQueueRow,
  CheckinReadiness,
  CheckinStatus,
  CheckinStatusView,
  PushSubscriptionJSON,
} from "@/lib/checkin/types";

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
          docs_needed_note?: string | null;
          notes?: string | null;
        };
        Update: {
          id?: string;
          dealer_id?: string;
          created_at?: string;
          vehicle_description?: string | null;
          transaction_type?: string | null;
          status?: TransactionStatus;
          docs_needed_note?: string | null;
          notes?: string | null;
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
      gen_ticket_code: {
        Args: Record<PropertyKey, never>;
        Returns: string;
      };
    };
  };
};
