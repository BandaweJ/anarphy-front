/* eslint-disable prettier/prettier */
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { map, Observable, switchMap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { UserManagementModel, UserDetailsModel, UserListPaginatedModel, CreateUserModel, UpdateUserModel, ChangePasswordModel, UserActivityPaginatedModel } from '../models/user-management.model';
import { ROLES } from '../../registration/models/roles.enum';

@Injectable({
  providedIn: 'root'
})
export class UserManagementService {
  private baseUrl = environment.apiUrl + '/user-management';

  constructor(private httpClient: HttpClient) {}

  createUser(user: CreateUserModel): Observable<any> {
    const signup = (id: string, role: string) =>
      this.httpClient.post<{ response: boolean }>(`${environment.apiUrl}/auth/signup`, {
        username: user.username,
        password: user.password,
        role,
        id,
      });

    if (user.role === ROLES.student) {
      const studentPayload = {
        name: user.name,
        surname: user.surname,
        gender: user.gender,
        dob: user.dob || undefined,
        idnumber: user.idnumber || undefined,
        dateOfJoining: user.dateOfJoining || undefined,
        cell: user.phone || undefined,
        email: user.email || undefined,
        address: user.address || undefined,
        prevSchool: user.prevSchool || undefined,
        residence: user.residence || 'Day',
      };

      return this.httpClient.post<any>(`${environment.apiUrl}/students`, studentPayload).pipe(
        switchMap((student) => signup(student.studentNumber, user.role)),
        map(() => ({ ...user, id: user.profileId || null, role: user.role }))
      );
    }

    if (user.role === ROLES.parent) {
      const parentPayload = {
        email: user.email,
        name: user.name || undefined,
        surname: user.surname,
        sex: user.gender,
        title: user.title,
        idnumber: user.idnumber || undefined,
        cell: user.phone,
        address: user.address,
      };

      return this.httpClient.post<any>(`${environment.apiUrl}/parents`, parentPayload).pipe(
        switchMap((parent) => signup(parent.email, user.role)),
        map(() => ({ ...user, id: user.email, role: user.role }))
      );
    }

    const teacherPayload = {
      id: user.profileId,
      name: user.name,
      surname: user.surname,
      dob: user.dob || undefined,
      gender: user.gender,
      title: user.title,
      dateOfJoining: user.dateOfJoining || undefined,
      qualifications: user.qualifications || [],
      active: true,
      cell: user.phone,
      email: user.email,
      address: user.address || undefined,
      dateOfLeaving: user.dateOfLeaving || undefined,
      role: user.role,
    };

    return this.httpClient.post<any>(`${environment.apiUrl}/teachers`, teacherPayload).pipe(
      switchMap((teacherResponse) => signup(teacherResponse.teacher?.id || user.profileId, user.role)),
      map(() => ({ ...user, id: user.profileId, role: user.role }))
    );
  }

  getAllUsers(
    page: number = 1,
    limit: number = 10,
    search?: string,
    role?: string,
    status?: string
  ): Observable<any[]> {
    // Use the new backend endpoint
    return this.httpClient.get<any[]>(`${environment.apiUrl}/auth/accounts/all`);
  }

  getUserById(id: string, role: string): Observable<UserDetailsModel> {
    // Use the existing auth endpoint
    return this.httpClient.get<UserDetailsModel>(`${environment.apiUrl}/auth/${id}/${role}`);
  }

  updateUser(id: string, user: UpdateUserModel): Observable<{ message: string }> {
    // Update account (username)
    return this.httpClient.patch<{ message: string }>(`${environment.apiUrl}/auth/${id}`, { username: user.username });
  }

  updateProfile(id: string, profileData: any): Observable<{ message: string }> {
    // Update profile (name, surname, email, cell, address)
    return this.httpClient.patch<{ message: string }>(`${environment.apiUrl}/auth/${id}/profile`, profileData);
  }

  deleteUser(id: string): Observable<{ message: string }> {
    return this.httpClient.delete<{ message: string }>(`${environment.apiUrl}/auth/accounts/${id}`);
  }

  restoreUser(id: string): Observable<{ message: string }> {
    return this.httpClient.post<{ message: string }>(`${environment.apiUrl}/auth/accounts/${id}/restore`, {});
  }

  changePassword(id: string, passwordData: ChangePasswordModel): Observable<{ message: string }> {
    return this.httpClient.post<{ message: string }>(`${this.baseUrl}/${id}/change-password`, passwordData);
  }

  resetPassword(id: string): Observable<{ message: string; generatedPassword: string }> {
    return this.httpClient.post<{ message: string; generatedPassword: string }>(`${environment.apiUrl}/auth/${id}/reset-password`, {});
  }

  setCustomPassword(id: string, password: string): Observable<{ message: string }> {
    return this.httpClient.post<{ message: string }>(`${environment.apiUrl}/auth/${id}/set-password`, { password });
  }

  getUserActivity(id: string, page: number = 1, limit: number = 20): Observable<UserActivityPaginatedModel> {
    const params = new HttpParams()
      .set('page', page.toString())
      .set('limit', limit.toString());

    return this.httpClient.get<UserActivityPaginatedModel>(`${environment.apiUrl}/auth/accounts/${id}/activity`, { params });
  }

  getSystemActivity(page: number = 1, limit: number = 20, action?: string, userId?: string, startDate?: string, endDate?: string): Observable<UserActivityPaginatedModel> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('limit', limit.toString());

    if (action) {
      params = params.set('action', action);
    }
    if (userId) {
      params = params.set('userId', userId);
    }
    if (startDate) {
      params = params.set('startDate', startDate);
    }
    if (endDate) {
      params = params.set('endDate', endDate);
    }

    // Use the correct backend endpoint at /activity/system
    return this.httpClient.get<UserActivityPaginatedModel>(`${environment.apiUrl}/activity/system`, { params });
  }
}


