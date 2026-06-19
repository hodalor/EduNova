export type UserRole = 'admin' | 'staff' | 'teacher' | 'parent' | 'student';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}
