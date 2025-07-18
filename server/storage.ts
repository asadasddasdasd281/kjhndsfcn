import {
  sessions,
  sessionData,
  images,
  annotations,
  formData,
  type Session,
  type SessionData,
  type Image,
  type Annotation,
  type FormData,
  type InsertSession,
  type InsertSessionData,
  type InsertImage,
  type InsertAnnotation,
  type InsertFormData,
} from "@shared/schema";

export interface IStorage {
  // Session operations
  createSession(session: InsertSession): Promise<Session>;
  getSession(id: number): Promise<Session | undefined>;
  getSessionByProductNumber(productNumber: string): Promise<Session | undefined>;
  updateSessionLastSaved(id: number): Promise<void>;
  getAllSessions(): Promise<Session[]>; // Added getAllSessions

  // Session data operations
  saveSessionData(data: InsertSessionData): Promise<SessionData>;
  getSessionData(sessionId: number, dataType: string): Promise<SessionData | undefined>;

  // Image operations
  saveImage(image: InsertImage): Promise<Image>;
  getSessionImages(sessionId: number): Promise<Image[]>;
  getImage(id: number): Promise<Image | undefined>;
  updateImageLabeled(id: number, labeledPath: string, annotationCount: number): Promise<void>;

  // Annotation operations
  saveAnnotation(annotation: InsertAnnotation): Promise<Annotation>;
  getImageAnnotations(imageId: number): Promise<Annotation[]>;
  getSessionAnnotations(sessionId: number): Promise<Annotation[]>;
  deleteAnnotation(id: number): Promise<void>;

  // Form data operations
  saveFormField(formField: InsertFormData): Promise<FormData>;
  getFormData(sessionId: number): Promise<FormData[]>;
  getFormSection(sessionId: number, section: string): Promise<FormData[]>;
}

export class MemStorage implements IStorage {
  private sessions: Map<number, Session>;
  private sessionData: Map<number, SessionData>;
  private images: Map<number, Image>;
  private annotations: Map<number, Annotation>;
  private formData: Map<number, FormData>;
  private currentId: { [key: string]: number };

  constructor() {
    this.sessions = new Map();
    this.sessionData = new Map();
    this.images = new Map();
    this.annotations = new Map();
    this.formData = new Map();
    this.currentId = {
      sessions: 1,
      sessionData: 1,
      images: 1,
      annotations: 1,
      formData: 1,
    };
  }

  async createSession(insertSession: InsertSession): Promise<Session> {
    const id = this.currentId.sessions++;
    const session: Session = {
      ...insertSession,
      id,
      status: "active",
      createdAt: new Date(),
      lastSaved: new Date(),
    };
    this.sessions.set(id, session);
    return session;
  }

  async getSession(id: number): Promise<Session | undefined> {
    return this.sessions.get(id);
  }

  async getSessionByProductNumber(productNumber: string): Promise<Session | undefined> {
    return Array.from(this.sessions.values()).find(
      (session) => session.productNumber === productNumber
    );
  }

  async updateSessionLastSaved(id: number): Promise<void> {
    const session = this.sessions.get(id);
    if (session) {
      session.lastSaved = new Date();
      this.sessions.set(id, session);
    }
  }

  async getAllSessions(): Promise<Session[]> {
    return Array.from(this.sessions.values());
  }

  async saveSessionData(insertData: InsertSessionData): Promise<SessionData> {
    const id = this.currentId.sessionData++;
    const data: SessionData = {
      ...insertData,
      id,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.sessionData.set(id, data);
    return data;
  }

  async getSessionData(sessionId: number, dataType: string): Promise<SessionData | undefined> {
    return Array.from(this.sessionData.values()).find(
      (data) => data.sessionId === sessionId && data.dataType === dataType
    );
  }

  async saveImage(insertImage: InsertImage): Promise<Image> {
    const id = this.currentId.images++;
    const image: Image = {
      ...insertImage,
      id,
      labeledPath: null,
      annotationCount: 0,
      isLabeled: false,
      uploadedAt: new Date(),
    };
    this.images.set(id, image);
    return image;
  }

  async getSessionImages(sessionId: number): Promise<Image[]> {
    return Array.from(this.images.values()).filter(
      (image) => image.sessionId === sessionId
    );
  }

  async getImage(id: number): Promise<Image | undefined> {
    return this.images.get(id);
  }

  async updateImageLabeled(id: number, labeledPath: string, annotationCount: number): Promise<void> {
    const image = this.images.get(id);
    if (image) {
      image.labeledPath = labeledPath;
      image.annotationCount = annotationCount;
      image.isLabeled = annotationCount > 0;
      this.images.set(id, image);
    }
  }

  async saveAnnotation(insertAnnotation: InsertAnnotation): Promise<Annotation> {
    const id = this.currentId.annotations++;
    const annotation: Annotation = {
      ...insertAnnotation,
      id,
      createdAt: new Date(),
    };
    this.annotations.set(id, annotation);
    return annotation;
  }

  async getImageAnnotations(imageId: number): Promise<Annotation[]> {
    return Array.from(this.annotations.values()).filter(
      (annotation) => annotation.imageId === imageId
    );
  }

  async getSessionAnnotations(sessionId: number): Promise<Annotation[]> {
    return Array.from(this.annotations.values()).filter(
      (annotation) => annotation.sessionId === sessionId
    );
  }

  async deleteAnnotation(id: number): Promise<void> {
    this.annotations.delete(id);
  }

  async saveFormField(insertFormField: InsertFormData): Promise<FormData> {
    // Check if field already exists and update it
    const existing = Array.from(this.formData.values()).find(
      (field) => 
        field.sessionId === insertFormField.sessionId &&
        field.section === insertFormField.section &&
        field.fieldName === insertFormField.fieldName
    );

    if (existing) {
      existing.fieldValue = insertFormField.fieldValue;
      existing.updatedAt = new Date();
      this.formData.set(existing.id, existing);
      return existing;
    } else {
      const id = this.currentId.formData++;
      const formField: FormData = {
        ...insertFormField,
        id,
        updatedAt: new Date(),
      };
      this.formData.set(id, formField);
      return formField;
    }
  }

  async getFormData(sessionId: number): Promise<FormData[]> {
    return Array.from(this.formData.values()).filter(
      (field) => field.sessionId === sessionId
    );
  }

  async getFormSection(sessionId: number, section: string): Promise<FormData[]> {
    return Array.from(this.formData.values()).filter(
      (field) => field.sessionId === sessionId && field.section === section
    );
  }
}

export const storage = new MemStorage();