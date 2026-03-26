import { Injectable } from '@angular/core';
import { MarksModel } from '../models/marks.model';

export interface QueuedMarkSave {
  key: string;
  mark: MarksModel;
  queuedAt: string; // ISO
}

@Injectable({
  providedIn: 'root',
})
export class MarksOfflineQueueService {
  private readonly storageKey = 'anarphy.marks.offlineQueue.v1';

  makeKey(mark: MarksModel): string {
    const termId = mark.termId ?? mark.term?.id;
    const examType = mark.examType ?? '';
    const subjectCode = mark.subject?.code ?? '';
    const studentNumber = mark.student?.studentNumber ?? '';
    return [String(termId ?? ''), String(examType), String(subjectCode), String(studentNumber)].join('|');
  }

  getAll(): QueuedMarkSave[] {
    try {
      const raw = localStorage.getItem(this.storageKey);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      return parsed.filter((x) => x && typeof x.key === 'string' && x.mark) as QueuedMarkSave[];
    } catch {
      return [];
    }
  }

  count(): number {
    return this.getAll().length;
  }

  upsert(mark: MarksModel): QueuedMarkSave[] {
    const key = this.makeKey(mark);
    const existing = this.getAll();
    const now = new Date().toISOString();

    const withoutKey = existing.filter((x) => x.key !== key);
    const next = [...withoutKey, { key, mark, queuedAt: now }];
    this.write(next);
    return next;
  }

  removeByKey(key: string): QueuedMarkSave[] {
    const existing = this.getAll();
    const next = existing.filter((x) => x.key !== key);
    this.write(next);
    return next;
  }

  clear(): void {
    try {
      localStorage.removeItem(this.storageKey);
    } catch {
      // ignore
    }
  }

  private write(items: QueuedMarkSave[]): void {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(items));
    } catch {
      // ignore (quota / private mode)
    }
  }
}

