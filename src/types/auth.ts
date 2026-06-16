export type AuthenticatedUser = {
  id: string;
  email: string | null;
  username: string | null;
  fullName: string | null;
  avatarUrl: string | null;
  displayName: string;
};
