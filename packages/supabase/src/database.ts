export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      activity: {
        Row: {
          id: string;
          project_id: string;
          summary: string;
          status: Database["public"]["Enums"]["activity_status"];
          changes: string | null;
          actor_name: string;
          actor_avatar_url: string | null;
          occurred_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          summary: string;
          status: Database["public"]["Enums"]["activity_status"];
          changes?: string | null;
          actor_name: string;
          actor_avatar_url?: string | null;
          occurred_at?: string;
        };
        Update: {
          id?: string;
          project_id?: string;
          summary?: string;
          status?: Database["public"]["Enums"]["activity_status"];
          changes?: string | null;
          actor_name?: string;
          actor_avatar_url?: string | null;
          occurred_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "activity_project_id_fkey";
            columns: ["project_id"];
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
        ];
      };
      api_keys: {
        Row: {
          id: string;
          workspace_id: string;
          name: string;
          prefix: string;
          created_at: string;
          last_used_at: string | null;
          revoked_at: string | null;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          name: string;
          prefix: string;
          created_at?: string;
          last_used_at?: string | null;
          revoked_at?: string | null;
        };
        Update: {
          id?: string;
          workspace_id?: string;
          name?: string;
          prefix?: string;
          created_at?: string;
          last_used_at?: string | null;
          revoked_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "api_keys_workspace_id_fkey";
            columns: ["workspace_id"];
            referencedRelation: "workspaces";
            referencedColumns: ["id"];
          },
        ];
      };
      domains: {
        Row: {
          id: string;
          project_id: string;
          hostname: string;
          path_prefix: string | null;
          status: Database["public"]["Enums"]["domain_status"];
          created_at: string;
          verified_at: string | null;
        };
        Insert: {
          id?: string;
          project_id: string;
          hostname: string;
          path_prefix?: string | null;
          status?: Database["public"]["Enums"]["domain_status"];
          created_at?: string;
          verified_at?: string | null;
        };
        Update: {
          id?: string;
          project_id?: string;
          hostname?: string;
          path_prefix?: string | null;
          status?: Database["public"]["Enums"]["domain_status"];
          created_at?: string;
          verified_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "domains_project_id_fkey";
            columns: ["project_id"];
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
        ];
      };
      deployments: {
        Row: {
          id: string;
          project_id: string;
          environment: Database["public"]["Enums"]["deployment_environment"];
          status: Database["public"]["Enums"]["deployment_status"];
          branch: string;
          commit_message: string | null;
          changes: string | null;
          preview_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          environment: Database["public"]["Enums"]["deployment_environment"];
          status: Database["public"]["Enums"]["deployment_status"];
          branch: string;
          commit_message?: string | null;
          changes?: string | null;
          preview_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          project_id?: string;
          environment?: Database["public"]["Enums"]["deployment_environment"];
          status?: Database["public"]["Enums"]["deployment_status"];
          branch?: string;
          commit_message?: string | null;
          changes?: string | null;
          preview_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "deployments_project_id_fkey";
            columns: ["project_id"];
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
        ];
      };
      git_connections: {
        Row: {
          id: string;
          project_id: string;
          provider: Database["public"]["Enums"]["git_provider"];
          organization: string;
          repository: string;
          branch: string;
          is_monorepo: boolean;
          docs_path: string | null;
          app_installed: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          provider: Database["public"]["Enums"]["git_provider"];
          organization: string;
          repository: string;
          branch: string;
          is_monorepo?: boolean;
          docs_path?: string | null;
          app_installed?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          project_id?: string;
          provider?: Database["public"]["Enums"]["git_provider"];
          organization?: string;
          repository?: string;
          branch?: string;
          is_monorepo?: boolean;
          docs_path?: string | null;
          app_installed?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "git_connections_project_id_fkey";
            columns: ["project_id"];
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
        ];
      };
      profiles: {
        Row: {
          id: string;
          email: string;
          full_name: string | null;
          avatar_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          full_name?: string | null;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          full_name?: string | null;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      projects: {
        Row: {
          id: string;
          workspace_id: string;
          slug: string;
          name: string;
          deployment_name: string;
          description: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          slug: string;
          name: string;
          deployment_name: string;
          description?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          workspace_id?: string;
          slug?: string;
          name?: string;
          deployment_name?: string;
          description?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "projects_workspace_id_fkey";
            columns: ["workspace_id"];
            referencedRelation: "workspaces";
            referencedColumns: ["id"];
          },
        ];
      };
      workspace_members: {
        Row: {
          id: string;
          workspace_id: string;
          email: string;
          role: Database["public"]["Enums"]["member_role"];
          status: Database["public"]["Enums"]["member_status"];
          joined_at: string | null;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          email: string;
          role: Database["public"]["Enums"]["member_role"];
          status?: Database["public"]["Enums"]["member_status"];
          joined_at?: string | null;
        };
        Update: {
          id?: string;
          workspace_id?: string;
          email?: string;
          role?: Database["public"]["Enums"]["member_role"];
          status?: Database["public"]["Enums"]["member_status"];
          joined_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "workspace_members_workspace_id_fkey";
            columns: ["workspace_id"];
            referencedRelation: "workspaces";
            referencedColumns: ["id"];
          },
        ];
      };
      workspaces: {
        Row: {
          id: string;
          slug: string;
          name: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          slug: string;
          name: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          slug?: string;
          name?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<never, never>;
    Functions: Record<never, never>;
    Enums: {
      activity_status: "successful" | "failed" | "building" | "queued";
      deployment_environment: "production" | "preview";
      deployment_status: "queued" | "building" | "successful" | "failed";
      domain_status:
        | "valid_configuration"
        | "pending_verification"
        | "invalid_configuration";
      git_provider: "github";
      member_role: "owner" | "admin" | "member";
      member_status: "active" | "invited" | "suspended";
    };
    CompositeTypes: Record<never, never>;
  };
}
