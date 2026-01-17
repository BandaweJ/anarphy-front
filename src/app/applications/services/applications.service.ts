import { HttpClient, HttpParams, HttpResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import {
  ApplicationModel,
  CreateApplicationDto,
  UpdateApplicationStatusDto,
} from '../models/application.model';
import { environment } from 'src/environments/environment';
import { map } from 'rxjs/operators';

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

  /**
   * Download application as PDF (admin only)
   */
  downloadApplicationPdf(id: string): Observable<HttpResponse<Blob>> {
    return this.httpClient.get(
      this.baseUrl + id + '/pdf',
      {
        responseType: 'blob',
        observe: 'response',
      }
    ).pipe(
      map((response: HttpResponse<Blob>) => {
        const contentDisposition = response.headers.get('content-disposition');
        let filename = `application_${id}.pdf`;
        
        if (contentDisposition) {
          const filenameMatch = contentDisposition.match(/filename="?(.+)"?/);
          if (filenameMatch) {
            filename = filenameMatch[1];
          }
        }

        const blob = response.body;
        if (blob) {
          const url = window.URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = filename;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          window.URL.revokeObjectURL(url);
        }

        return response;
      })
    );
  }
}



