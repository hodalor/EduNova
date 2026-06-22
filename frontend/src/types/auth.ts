export type EducationLevelCode = 'DC' | 'PR' | 'JH' | 'SH' | 'TR';

export type UserRole =
  | 'super_admin'
  | 'institution_admin'
  | 'teacher'
  | 'student'
  | 'parent'
  | 'driver'
  | 'accountant'
  | 'librarian';

export interface InstitutionSummary {
  id: string;
  name: string;
  code: string;
  subscription_plan?: string;
  logo_url?: string | null;
  education_levels?: EducationLevelCode[];
  settings?: {
    tenant_database?: {
      cluster_name?: string;
      database_name?: string;
      database_user?: string;
      schema_name?: string;
      provision_status?: string;
    };
    workspace_profile?: {
      label?: string;
      menus?: string[];
    };
    platform?: {
      god_mode?: boolean;
      cluster?: {
        cluster_name?: string;
        engine?: string;
        host?: string;
        port?: number;
        strategy?: string;
      };
    };
    tertiary?: {
      calendar_model?: 'semester' | 'trimester' | 'quarter';
      credentials?: string[];
      id_format?: string;
    };
    daycare?: {
      pickup_pin_required?: boolean;
      session_model?: 'halfDay' | 'fullDay';
    };
  };
}

export interface AuthUser {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  username?: string;
  role: UserRole;
  institution_id: string;
  phone?: string | null;
  profile_photo?: string | null;
}

export interface LoginResponse {
  user: AuthUser;
  institution: InstitutionSummary;
  permissions: string[];
  tokens: {
    access_token: string;
    refresh_token: string;
    expires_in: number;
  };
}
