import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

@Injectable({ providedIn: 'root' })
export class MoneyService {
  private apiUrl = 'https://outside-between.onrender.com/api/money';

  constructor(private http: HttpClient) {}

    updateMoney(data: { username: string, amount: number }) {
      return this.http.post(`${this.apiUrl}/update`, data);
    }
}
