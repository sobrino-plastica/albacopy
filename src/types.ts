export type CopyPurpose = 'personal' | 'alumnado';

export interface EducarexUser {
  email: string;
  name?: string;
  teacherCode: string;
  department?: string;
  loggedAt: string;
}

export interface PrintOptionsData {
  doubleSided: boolean;
  paperSize: 'A4' | 'A3';
  colorMode: 'bn' | 'color';
  stapled: boolean;
  urgency: 'normal' | 'urgente';
  notes: string;
}

export interface AttachedPdf {
  name: string;
  size: number;
  type: string;
  file: File;
  lastModified?: number;
}

export interface CopyFormData {
  teacherCode: string;
  teacherName: string;
  copiesCount: number;
  purpose: CopyPurpose;
  options: PrintOptionsData;
  pdf: AttachedPdf | null;
}

export interface AiOptimizationResult {
  subject: string;
  body: string;
  summary: string;
  recommendations: string[];
}

export interface SendEmailResponse {
  success: boolean;
  message: string;
  error?: string;
  method: 'smtp';
  recipient: string;
  timestamp: string;
  details?: {
    teacherCode: string;
    copiesCount: number;
    purpose: string;
    course?: string;
    group?: string;
    pdfName?: string;
  };
}
