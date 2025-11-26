import { ROLES } from './roles.enum';

export interface StudentsModel {
  name: string;
  surname: string;
  gender: string;

  // Optional / nullable fields for new-school setup
  dob?: Date | null;
  idnumber?: string | null;
  dateOfJoining?: Date | null;
  cell?: string | null;
  email?: string | null;
  address?: string | null;
  prevSchool?: string | null;

  studentNumber: string;
  role: ROLES;
}
