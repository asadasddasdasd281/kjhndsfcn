# Sneaker Authentication Lab - replit.md

## Overview

This is a full-stack web application for sneaker authentication and machine learning training data collection. The system allows users to upload images of sneakers, annotate them with bounding boxes to identify potential issues, and collect form data for authentication purposes. The application is designed to generate training datasets for computer vision models that can detect counterfeit sneakers.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter for client-side routing
- **State Management**: TanStack Query (React Query) for server state management
- **UI Framework**: Radix UI components with Tailwind CSS styling
- **Component Library**: Shadcn/ui for pre-built, accessible components
- **Build Tool**: Vite for fast development and optimized builds
- **Forms**: React Hook Form with Zod validation

### Backend Architecture
- **Framework**: Express.js with TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **Database Provider**: Neon Database (serverless PostgreSQL)
- **File Storage**: Local file system with multer for uploads
- **API Design**: RESTful endpoints with JSON responses
- **Development**: Hot reload with tsx for server-side TypeScript execution

### Build System
- **Frontend**: Vite with React plugin
- **Backend**: esbuild for production bundling
- **Type Checking**: TypeScript with strict mode enabled
- **CSS**: Tailwind CSS with PostCSS processing

## Key Components

### Database Schema
The application uses a normalized PostgreSQL schema with the following main entities:

- **Sessions**: Main workflow sessions tied to product numbers
- **Images**: Uploaded sneaker images with metadata
- **Annotations**: Bounding box annotations on images with categories
- **Form Data**: Authentication form fields organized by sections
- **Session Data**: Generic JSON storage for session state

### Authentication Flow
The system implements a session-based workflow where each authentication session is identified by a product number. Users progress through:

1. **Session Initialization**: Create or resume a session
2. **Image Upload**: Upload multiple sneaker images
3. **Image Labeling**: Draw bounding boxes and categorize issues
4. **Form Completion**: Fill authentication details across multiple sections
5. **Export**: Generate training data exports

### File Management
- **Upload Directory**: `/uploads` for temporary file storage
- **Project Structure**: `/projects/project-{productNumber}/` for organized storage
- **Image Processing**: Original and labeled image separation
- **Export Generation**: ZIP files with images and annotation data

## Data Flow

### Image Processing Workflow
1. Users upload images via drag-and-drop or file selection
2. Images are stored with metadata in the database
3. Canvas-based annotation interface allows bounding box drawing
4. Annotations are saved with category and subcategory classifications
5. Labeled images can be exported for ML training

### Form Data Collection
1. Multi-section forms collect authentication metadata
2. Fields are dynamically rendered based on section type
3. Progress tracking shows completion status
4. Data is saved incrementally as users progress

### Export System
1. Sessions can be exported as ZIP files
2. Exports include original images, labeled images, and JSON annotations
3. CSV exports provide tabular data for analysis

## External Dependencies

### Core Technologies
- **React Ecosystem**: React, React DOM, React Query
- **UI Libraries**: Radix UI primitives, Lucide React icons
- **Database**: Neon Database, Drizzle ORM
- **File Processing**: Multer, JSZip, CSV parsing libraries
- **Development Tools**: Vite, TypeScript, Tailwind CSS

### Development Environment
- **Runtime**: Node.js 20
- **Package Manager**: npm
- **Database**: PostgreSQL 16 (via Neon)
- **Deployment**: Autoscale deployment target

## Deployment Strategy

### Development
- **Local Development**: `npm run dev` starts both frontend and backend
- **Hot Reload**: Vite provides fast refresh for frontend changes
- **Database**: Drizzle Kit for schema migrations and updates

### Production
- **Build Process**: 
  1. `npm run build` creates optimized frontend bundle
  2. esbuild bundles backend into single file
  3. Static assets served from `/dist/public`
- **Server**: Express serves both API and static files
- **Environment**: Production mode with `NODE_ENV=production`

### Configuration
- **Environment Variables**: `DATABASE_URL` required for database connection
- **Ports**: Application runs on port 5000 (configurable)
- **Static Files**: Frontend assets served from `/dist/public`

## Changelog

Changelog:
- June 26, 2025. Initial setup

## User Preferences

Preferred communication style: Simple, everyday language.