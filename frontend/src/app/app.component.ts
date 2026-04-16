import { Component } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../environments/environment';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  leadName = '';
  company = '';
  phone = '';
  notes = '';
  status = '';
  loading = false;

  constructor(private http: HttpClient) {}

  submitCall() {
    if (!this.leadName || !this.company || !this.phone) {
      this.status = 'Please fill in lead name, company, and phone.';
      return;
    }

    this.loading = true;
    this.status = 'Sending call request...';

    this.http.post(`${environment.apiBaseUrl}/api/call`, {
      phone: this.phone,
      leadName: this.leadName,
      company: this.company,
      notes: this.notes
    }).subscribe({
      next: (response: any) => {
        this.status = `Call initiated. Call SID: ${response.callSid}`;
        this.loading = false;
      },
      error: (error) => {
        this.status = `Request failed: ${error.error?.error || error.message}`;
        this.loading = false;
      }
    });
  }
}
