import { ChangeDetectionStrategy, ChangeDetectorRef, Component, Inject, OnDestroy, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { StudentsModel } from '../../models/students.model';
import { DomSanitizer, SafeUrl, Title } from '@angular/platform-browser';
import * as QRCode from 'qrcode';
import { SystemSettings, SystemSettingsService } from 'src/app/system/services/system-settings.service';

@Component({
  selector: 'app-student-id-card',
  templateUrl: './student-id-card.component.html',
  styleUrls: ['./student-id-card.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class StudentIdCardComponent implements OnInit, OnDestroy {
  student!: StudentsModel;
  qrCodeDataUrl: SafeUrl = '';
  isLoading = true;
  currentDate = new Date();
  systemSettings: SystemSettings | null = null;

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: StudentsModel,
    private dialogRef: MatDialogRef<StudentIdCardComponent>,
    private sanitizer: DomSanitizer,
    private cdr: ChangeDetectorRef,
    private title: Title,
    private systemSettingsService: SystemSettingsService,
  ) {
    this.student = data;
  }

  ngOnInit(): void {
    this.title.setTitle(
      `Student ID Card - ${this.student.name} ${this.student.surname}`,
    );

    // Load system settings (school name, address, logo) for ID card branding
    this.systemSettingsService.getSettings().subscribe({
      next: (settings) => {
        this.systemSettings = settings;
        this.generateQRCode();
      },
      error: () => {
        // Fallback to defaults if settings cannot be loaded
        this.generateQRCode();
      },
    });
  }

  ngOnDestroy(): void {
    // Cleanup if needed
  }

  private async generateQRCode(): Promise<void> {
    try {
      // Create QR code data with student information
      const qrData = {
        studentNumber: this.student.studentNumber,
        name: `${this.student.name} ${this.student.surname}`,
        idNumber: this.student.idnumber,
        school: this.systemSettings?.schoolName || 'Anarphy High School',
        url: `${window.location.origin}/student-view/${this.student.studentNumber}`
      };

      console.log('Generating QR code with data:', qrData);

      // Generate QR code as data URL
      const qrCodeDataUrl = await QRCode.toDataURL(JSON.stringify(qrData), {
        width: 200,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        },
        errorCorrectionLevel: 'M'
      });

      console.log('QR code generated successfully, length:', qrCodeDataUrl.length);
      this.qrCodeDataUrl = qrCodeDataUrl;
      this.isLoading = false;
      this.cdr.markForCheck();
    } catch (error) {
      console.error('Error generating QR code:', error);
      // Create a fallback placeholder
      this.qrCodeDataUrl = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iI2ZmZmZmZiIvPjx0ZXh0IHg9IjEwMCIgeT0iMTAwIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTIiIGZpbGw9IiMwMDAiIHRleHQtYW5jaG9yPSJtaWRkbGUiPFFSIEVycm9yPC90ZXh0Pjwvc3ZnPg==';
      this.isLoading = false;
      this.cdr.markForCheck();
    }
  }

  async printIDCard(): Promise<void> {
    const html2canvas = (await import('html2canvas')).default;
    const card = document.getElementById('id-card-content');
    if (!card || !html2canvas) {
      return;
    }

    const canvas = await html2canvas(card, {
      scale: 2,
      useCORS: true,
      backgroundColor: null,
      logging: false,
    });

    const dataUrl = canvas.toDataURL('image/png');
    const printWindow = window.open('', '_blank', 'width=900,height=600');
    if (!printWindow) {
      return;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Student ID Card - ${this.student.name} ${this.student.surname}</title>
        <style>
          @page { size: auto; margin: 0; }
          body {
            margin: 0;
            padding: 0;
            display: flex;
            align-items: center;
            justify-content: center;
            background: #ffffff;
          }
          img {
            max-width: 100%;
            height: auto;
          }
        </style>
      </head>
      <body>
        <img src="${dataUrl}" alt="Student ID Card" />
      </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.onload = () => {
      setTimeout(() => {
        printWindow.focus();
        printWindow.print();
        printWindow.close();
      }, 300);
    };
  }

  async downloadIDCard(): Promise<void> {
    try {
      const html2canvas = (await import('html2canvas')).default;
      const card = document.getElementById('id-card-content');
      if (!card || !html2canvas) {
        return;
      }

      const canvas = await html2canvas(card, {
        scale: 2,
        useCORS: true,
        backgroundColor: null,
        logging: false,
      });

      canvas.toBlob((blob) => {
        if (!blob) {
          return;
        }
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `student-id-card-${this.student.studentNumber}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }, 'image/png', 0.95);
    } catch (error) {
      console.error('Error downloading ID card:', error);
    }
  }

  closeDialog(): void {
    this.dialogRef.close();
  }
}