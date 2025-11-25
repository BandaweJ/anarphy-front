import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { SigninInterface } from './models/signin.model';
import { Observable } from 'rxjs';
import { SignupInterface } from './models/signup.model';
import { AccountStats } from './models/account-stats.model';
import { environment } from 'src/environments/environment';
import { Router } from '@angular/router';
import jwt_decode from 'jwt-decode';
import { User } from './models/user.model';
import { StudentsModel } from '../registration/models/students.model';
import { TeachersModel } from '../registration/models/teachers.model';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  constructor(
    private http: HttpClient // private router: Router, // private store: Store
  ) {}

  private baseUrl = `${environment.apiUrl}/auth/`;

  getToken(): string | null {
    return localStorage.getItem('token');
  }

  getAuthStatus(): { isLoggedIn: boolean; user?: User; accessToken?: string } {
    const token = this.getToken();
    if (!token) {
      return { isLoggedIn: false };
    }

    try {
      const user: User = jwt_decode(token); // Decode the token
      const expiryTimeSeconds = user.exp; // 'exp' claim is in seconds

      if (!expiryTimeSeconds) {
        return { isLoggedIn: false };
      }

      const expiryDate = new Date(expiryTimeSeconds * 1000); // Convert seconds to milliseconds
      if (expiryDate >= new Date()) {
        return { isLoggedIn: true, user: user, accessToken: token };
      } else {
        return { isLoggedIn: false };
      }
    } catch (error) {
      return { isLoggedIn: false }; // Error decoding, consider token invalid/expired
    }
  }

  signin(signinData: SigninInterface): Observable<{ accessToken: string; permissions: string[]; isBootstrap?: boolean }> {
    return this.http.post<{ accessToken: string; permissions: string[]; isBootstrap?: boolean }>(
      this.baseUrl + 'signin',

      signinData
    );
  }

  signup(signupData: SignupInterface): Observable<{ response: boolean }> {
    return this.http.post<{ response: boolean }>(
      this.baseUrl + 'signup',
      signupData
    );
  }

  getAccountsStats(): Observable<AccountStats> {
    return this.http.get<AccountStats>(this.baseUrl);
  }

  fetchUserDetails(
    id: string,
    role: string
  ): Observable<StudentsModel | TeachersModel> {
    return this.http.get<StudentsModel | TeachersModel>(
      `${this.baseUrl}${id}/${role}`
    );
  }
}
