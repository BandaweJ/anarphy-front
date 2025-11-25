import { Injectable } from '@angular/core';
import { CanDeactivate } from '@angular/router';
import { Observable } from 'rxjs';
import { TeachersListComponent } from '../registration/teachers-list/teachers-list.component';

@Injectable({
  providedIn: 'root',
})
export class BootstrapTeachersGuard implements CanDeactivate<TeachersListComponent> {
  canDeactivate(
    component: TeachersListComponent
  ): Observable<boolean> | Promise<boolean> | boolean {
    // Check if user is bootstrap and if teachers exist
    const token = localStorage.getItem('token');
    if (!token) {
      return true; // Allow navigation if not logged in
    }

    try {
      const decoded: any = JSON.parse(atob(token.split('.')[1]));
      const isBootstrap = decoded.isBootstrap === true;

      if (isBootstrap) {
        // Check if component has teachers
        return component.hasTeachers || false;
      }
    } catch (e) {
      // If token decode fails, allow navigation
      return true;
    }

    return true; // Allow navigation for non-bootstrap users
  }
}


