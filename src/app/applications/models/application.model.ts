export enum ApplicationStatus {
  PENDING = 'pending',
  ON_HOLD = 'on_hold',
  ACCEPTED = 'accepted',
  DECLINED = 'declined',
}

export interface ApplicationModel {
  id: string;
  applicationId: string;
  name: string;
  surname: string;
  gender: string;
  dob?: Date | null;
  idnumber?: string | null;
  email?: string | null;
  cell?: string | null;
  address?: string | null;
  prevSchool?: string | null;
  prevSchoolRecords?: string | null;
  desiredClass: string;
  parentName: string;
  parentSurname: string;
  parentEmail?: string | null;
  parentCell?: string | null;
  parentRelationship?: string | null;
  status: ApplicationStatus;
  studentNumber?: string | null;
  reviewedBy?: string | null;
  reviewedAt?: Date | null;
  reviewNotes?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateApplicationDto {
  name: string;
  surname: string;
  gender: string;
  dob?: string;
  idnumber?: string;
  email?: string;
  cell?: string;
  address?: string;
  prevSchool?: string;
  prevSchoolRecords?: string;
  desiredClass: string;
  parentName: string;
  parentSurname: string;
  parentEmail?: string;
  parentCell?: string;
  parentRelationship?: string;
}

export interface UpdateApplicationStatusDto {
  status: ApplicationStatus;
  reviewNotes?: string;
}



