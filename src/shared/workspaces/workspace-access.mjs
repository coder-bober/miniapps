export const workspaceMembershipRoles = ["owner", "admin", "member"];

export function isWorkspaceMembershipRole(value) {
  return workspaceMembershipRoles.includes(value);
}
