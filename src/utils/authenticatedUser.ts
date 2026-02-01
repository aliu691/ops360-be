export type AuthenticatedActor =
  | {
      type: 'ADMIN';
      id: number;
      role: 'ADMIN' | 'SUPER_ADMIN';
      email: string;
    }
  | {
      type: 'USER';
      id: number;
      department: 'SALES' | 'PRE_SALES';
      email: string;
    };
