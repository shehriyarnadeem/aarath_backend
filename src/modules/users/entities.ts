/**
 * An interface describing the shape of a user entity in the domain.
 * This type mirrors the User model defined in prisma/schema.prisma.
 */
export interface User {
  id: number;
  email: string;
  name?: string | null;
}
