import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import {
  ApplicationModel,
  CreateApplicationDto,
  UpdateApplicationStatusDto,
} from '../models/application.model';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root',
})
export class ApplicationsService {
  constructor(private httpClient: HttpClient) {}

  private baseUrl = environment.apiUrl + '/applications/';

  /**
   * Submit a new application (public endpoint)
   */
  createApplication(
    application: CreateApplicationDto,
  ): Observable<ApplicationModel> {
    return this.httpClient.post<ApplicationModel>(this.baseUrl, application);
  }

  /**
   * Get all applications (admin only)
   */
  getAllApplications(
    status?: string,
    search?: string,
  ): Observable<ApplicationModel[]> {
    let params = new HttpParams();
    if (status) {
      params = params.set('status', status);
    }
    if (search) {
      params = params.set('search', search);
    }
    return this.httpClient.get<ApplicationModel[]>(this.baseUrl, { params });
  }

  /**
   * Get application by ID (admin only)
   */
  getApplicationById(id: string): Observable<ApplicationModel> {
    return this.httpClient.get<ApplicationModel>(this.baseUrl + id);
  }

  /**
   * Update application status (admin only)
   */
  updateApplicationStatus(
    id: string,
    updateDto: UpdateApplicationStatusDto,
  ): Observable<ApplicationModel> {
    return this.httpClient.put<ApplicationModel>(
      this.baseUrl + id + '/status',
      updateDto,
    );
  }

  /**
   * Track application by application ID (public endpoint)
   */
  trackApplication(applicationId: string): Observable<ApplicationModel> {
    return this.httpClient.get<ApplicationModel>(
      this.baseUrl + 'track/' + applicationId,
    );
  }
}



