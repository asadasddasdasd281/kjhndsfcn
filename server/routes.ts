import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { 
  insertSessionSchema, 
  insertImageSchema, 
  insertAnnotationSchema,
  insertFormDataSchema,
  type SessionProgress 
} from "@shared/schema";
import multer from "multer";
import path from "path";
import fs from "fs/promises";
import JSZip from "jszip";
import { parse as csvParse } from "csv-parse/sync";
import ExcelJS from "exceljs";

// Configure multer for file uploads
const upload = multer({
  dest: "uploads/",
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
  },
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Ensure directories exist
  await ensureDirectoryExists("uploads");
  await ensureDirectoryExists("data");
  await ensureDirectoryExists("projects");

  // Session routes
  app.post("/api/sessions", async (req, res) => {
    try {
      const sessionData = insertSessionSchema.parse(req.body);

      // Check if session already exists
      const existing = await storage.getSessionByProductNumber(sessionData.productNumber);
      if (existing) {
        return res.json(existing);
      }

      const session = await storage.createSession(sessionData);

      // Create project directory
      const projectDir = path.join("projects", `project-${session.productNumber}`);
      await ensureDirectoryExists(projectDir);
      await ensureDirectoryExists(path.join(projectDir, "images", "original"));
      await ensureDirectoryExists(path.join(projectDir, "images", "labeled"));
      await ensureDirectoryExists(path.join(projectDir, "annotations"));
      await ensureDirectoryExists(path.join(projectDir, "form"));

      res.json(session);
    } catch (error) {
      console.error("Error creating session:", error);
      res.status(400).json({ message: "Invalid session data" });
    }
  });

  // Get all sessions
  app.get("/api/sessions", async (req, res) => {
    try {
      const sessions = await storage.getAllSessions();
      res.json(sessions);
    } catch (error) {
      console.error("Error fetching sessions:", error);
      res.status(500).json({ message: "Failed to fetch sessions" });
    }
  });

  // Get session by product number
  app.get("/api/sessions/:productNumber", async (req, res) => {
    try {
      const productNumber = req.params.productNumber;
      const session = await storage.getSessionByProductNumber(productNumber);

      if (!session) {
        return res.status(404).json({ message: "Session not found" });
      }

      res.json(session);
    } catch (error) {
      console.error("Error fetching session:", error);
      res.status(500).json({ message: "Failed to fetch session" });
    }
  });

  app.get("/api/sessions/:sessionId/progress", async (req, res) => {
    try {
      const sessionId = parseInt(req.params.sessionId);
      const images = await storage.getSessionImages(sessionId);
      const annotations = await storage.getSessionAnnotations(sessionId);
      const formData = await storage.getFormData(sessionId);

      const progress: SessionProgress = {
        imageFlow: {
          uploadCount: images.length,
          labeledCount: images.filter(img => img.isLabeled).length,
          annotationCount: annotations.length,
        },
        formFlow: {
          productInfoComplete: formData.some(f => f.section === "product_info"),
          auth1Complete: formData.some(f => f.section === "auth1"),
          auth2Complete: formData.some(f => f.section === "auth2"),
          regionalComplete: formData.some(f => f.section === "regional"),
          feedbackComplete: formData.some(f => f.section === "feedback"),
        },
      };

      res.json(progress);
    } catch (error) {
      console.error("Error fetching progress:", error);
      res.status(500).json({ message: "Failed to fetch progress" });
    }
  });

  // Image upload routes
  app.post("/api/sessions/:sessionId/images", upload.array("images"), async (req, res) => {
    try {
      const sessionId = parseInt(req.params.sessionId);
      const files = req.files as Express.Multer.File[];

      console.log("Upload request:", {
        sessionId,
        filesCount: files?.length || 0,
        contentType: req.headers['content-type'],
        files: files?.map(f => ({ 
          originalname: f.originalname, 
          mimetype: f.mimetype, 
          size: f.size 
        }))
      });

      if (!files || files.length === 0) {
        return res.status(400).json({ message: "No files uploaded" });
      }

      const session = await storage.getSession(sessionId);
      if (!session) {
        return res.status(404).json({ message: "Session not found" });
      }

      const projectDir = path.join("projects", `project-${session.productNumber}`);
      const uploadedImages = [];

      for (const file of files) {
        if (file.mimetype === "application/zip") {
          // Handle zip file
          const zipImages = await extractZipImages(file.path, projectDir);
          for (const zipImage of zipImages) {
            const savedImage = await storage.saveImage({
              sessionId,
              originalName: zipImage.originalName,
              fileName: zipImage.fileName,
              filePath: zipImage.filePath,
            });
            uploadedImages.push(savedImage);
          }
        } else if (file.mimetype.startsWith("image/")) {
          // Handle individual image
          const fileName = `${Date.now()}-${file.originalname}`;
          const filePath = path.join(projectDir, "images", "original", fileName);

          await fs.copyFile(file.path, filePath);

          const savedImage = await storage.saveImage({
            sessionId,
            originalName: file.originalname,
            fileName,
            filePath,
          });
          uploadedImages.push(savedImage);
        }

        // Clean up temp file
        await fs.unlink(file.path).catch(() => {});
      }

      await storage.updateSessionLastSaved(sessionId);
      res.json(uploadedImages);
    } catch (error) {
      console.error("Error uploading images:", error);
      res.status(500).json({ message: "Failed to upload images" });
    }
  });

  app.get("/api/sessions/:sessionId/images", async (req, res) => {
    try {
      const sessionId = parseInt(req.params.sessionId);
      const images = await storage.getSessionImages(sessionId);
      res.json(images);
    } catch (error) {
      console.error("Error fetching images:", error);
      res.status(500).json({ message: "Failed to fetch images" });
    }
  });

  app.get("/api/images/:imageId/file", async (req, res) => {
    try {
      const imageId = parseInt(req.params.imageId);
      const image = await storage.getImage(imageId);

      if (!image) {
        return res.status(404).json({ message: "Image not found" });
      }

      const filePath = image.filePath;
      const exists = await fs.access(filePath).then(() => true).catch(() => false);

      if (!exists) {
        return res.status(404).json({ message: "Image file not found" });
      }

      res.sendFile(path.resolve(filePath));
    } catch (error) {
      console.error("Error serving image:", error);
      res.status(500).json({ message: "Failed to serve image" });
    }
  });

  // Annotation routes
  app.post("/api/annotations", async (req, res) => {
    try {
      const annotationData = insertAnnotationSchema.parse(req.body);
      const annotation = await storage.saveAnnotation(annotationData);

      // Update image annotation count and attempt to generate labeled image
      const imageAnnotations = await storage.getImageAnnotations(annotationData.imageId);
      const image = await storage.getImage(annotationData.imageId);

      if (image) {
        const session = await storage.getSession(image.sessionId);
        const baseName = image.fileName.replace(/\.[^/.]+$/, "");
        const labeledFileName = `${baseName}_labeled.png`;
        const labeledPath = path.join("projects", `project-${session!.productNumber}`, "images", "labeled", labeledFileName);
        
        // Try to generate labeled image, but don't fail the annotation save if it fails
        try {
          await generateLabeledImage(image, imageAnnotations, labeledPath);
          await storage.updateImageLabeled(annotationData.imageId, labeledPath, imageAnnotations.length);
          console.log(`Successfully generated labeled image: ${labeledPath}`);
        } catch (labelingError) {
          console.warn(`Failed to generate labeled image for ${image.fileName}, but annotation was saved:`, labelingError.message);
          // Still update the annotation count even if labeled image generation fails
          await storage.updateImageLabeled(annotationData.imageId, null, imageAnnotations.length);
        }
        
        await storage.updateSessionLastSaved(image.sessionId);
      }

      res.json(annotation);
    } catch (error) {
      console.error("Error saving annotation:", error);
      res.status(400).json({ message: "Invalid annotation data" });
    }
  });

  app.get("/api/images/:imageId/annotations", async (req, res) => {
    try {
      const imageId = parseInt(req.params.imageId);
      const annotations = await storage.getImageAnnotations(imageId);
      res.json(annotations);
    } catch (error) {
      console.error("Error fetching annotations:", error);
      res.status(500).json({ message: "Failed to fetch annotations" });
    }
  });

  app.delete("/api/annotations/:annotationId", async (req, res) => {
    try {
      const annotationId = parseInt(req.params.annotationId);
      await storage.deleteAnnotation(annotationId);
      res.json({ message: "Annotation deleted" });
    } catch (error) {
      console.error("Error deleting annotation:", error);
      res.status(500).json({ message: "Failed to delete annotation" });
    }
  });

  // Form data routes
  app.post("/api/sessions/:sessionId/form", async (req, res) => {
    try {
      const sessionId = parseInt(req.params.sessionId);
      const { section, fields } = req.body;

      const savedFields = [];
      for (const [fieldName, fieldValue] of Object.entries(fields)) {
        const formField = await storage.saveFormField({
          sessionId,
          section,
          fieldName,
          fieldValue: String(fieldValue),
        });
        savedFields.push(formField);
      }

      await storage.updateSessionLastSaved(sessionId);
      res.json(savedFields);
    } catch (error) {
      console.error("Error saving form data:", error);
      res.status(500).json({ message: "Failed to save form data" });
    }
  });

  app.get("/api/sessions/:sessionId/form", async (req, res) => {
    try {
      const sessionId = parseInt(req.params.sessionId);
      const formData = await storage.getFormData(sessionId);

      // Group by section
      const groupedData = formData.reduce((acc, field) => {
        if (!acc[field.section]) {
          acc[field.section] = {};
        }
        acc[field.section][field.fieldName] = field.fieldValue;
        return acc;
      }, {} as Record<string, Record<string, string>>);

      res.json(groupedData);
    } catch (error) {
      console.error("Error fetching form data:", error);
      res.status(500).json({ message: "Failed to fetch form data" });
    }
  });

  // Category data routes
  app.get("/api/categories", async (req, res) => {
    try {
      const categoriesPath = path.join("data", "for_fake_reasons.csv");
      const csvContent = await fs.readFile(categoriesPath, "utf-8");
      const records = csvParse(csvContent, { columns: true });

      // Group by category
      const categories = records.reduce((acc, record) => {
        const category = record.category;
        if (!acc[category]) {
          acc[category] = {
            id: category.toLowerCase().replace(/\s+/g, "-"),
            name: category,
            subcategories: [],
          };
        }
        acc[category].subcategories.push(record.subcategory);
        return acc;
      }, {} as Record<string, any>);

      res.json(Object.values(categories));
    } catch (error) {
      console.error("Error loading categories:", error);
      res.status(500).json({ message: "Failed to load categories" });
    }
  });

  app.get("/api/warehouses", async (req, res) => {
    try {
      const warehousesPath = path.join("data", "warehouses.csv");
      const csvContent = await fs.readFile(warehousesPath, "utf-8");
      const records = csvParse(csvContent, { columns: true });
      res.json(records);
    } catch (error) {
      console.error("Error loading warehouses:", error);
      res.status(500).json({ message: "Failed to load warehouses" });
    }
  });

  // Export route
  app.get("/api/sessions/:sessionId/export", async (req, res) => {
    try {
      const sessionId = parseInt(req.params.sessionId);
      const session = await storage.getSession(sessionId);

      if (!session) {
        return res.status(404).json({ message: "Session not found" });
      }

      const projectDir = path.join("projects", `project-${session.productNumber}`);
      const zip = new JSZip();

      // Add images
      const images = await storage.getSessionImages(sessionId);
      for (const image of images) {
        try {
          const originalFile = await fs.readFile(image.filePath);
          zip.file(`images/original/${image.fileName}`, originalFile);

          if (image.labeledPath) {
            const labeledFile = await fs.readFile(image.labeledPath).catch(() => null);
            if (labeledFile) {
              zip.file(`images/labeled/${image.fileName}`, labeledFile);
            }
          }
        } catch (error) {
          console.error(`Error adding image ${image.fileName}:`, error);
        }
      }

      // Add annotations
      const annotations = await storage.getSessionAnnotations(sessionId);
      const annotationsData = annotations.map(annotation => ({
        imageId: annotation.imageId,
        boundingBox: annotation.boundingBox,
        category: annotation.category,
        subcategories: annotation.subcategories,
        createdAt: annotation.createdAt,
      }));
      zip.file("annotations/annotations.json", JSON.stringify(annotationsData, null, 2));

      // Add form data
      const formData = await storage.getFormData(sessionId);
      const formCSV = generateFormCSV(formData);

      zip.file("form/form.csv", formCSV);

      // Add pre-generated labeled images or generate them if missing
      for (const image of images) {
        try {
          if (image.labeledPath) {
            // Try to use pre-generated labeled image
            const labeledFile = await fs.readFile(image.labeledPath).catch(() => null);
            if (labeledFile) {
              const baseName = image.fileName.replace(/\.[^/.]+$/, "");
              const labeledName = `${baseName}_labeled.png`;
              zip.file(`images/labeled/${labeledName}`, labeledFile);
              continue;
            }
          }

          // Fallback: generate labeled image if not found and has annotations
          const imageAnnotations = annotations.filter(ann => ann.imageId === image.imageId);
          if (imageAnnotations.length > 0 && image.filePath) {
            const baseName = image.fileName.replace(/\.[^/.]+$/, "");
            const labeledName = `${baseName}_labeled.png`;
            const tempLabeledPath = path.join("projects", `project-${session.productNumber}`, "images", "labeled", labeledName);
            
            await generateLabeledImage(image, imageAnnotations, tempLabeledPath);
            
            const labeledBuffer = await fs.readFile(tempLabeledPath).catch(() => null);
            if (labeledBuffer) {
              zip.file(`images/labeled/${labeledName}`, labeledBuffer);
            }
          }
        } catch (error) {
          console.error(`Error processing labeled image for ${image.fileName}:`, error);
        }
      }

      const zipBuffer = await zip.generateAsync({ type: "nodebuffer" });

      res.setHeader("Content-Type", "application/zip");
      res.setHeader("Content-Disposition", `attachment; filename="project-${session.productNumber}.zip"`);
      res.send(zipBuffer);
    } catch (error) {
      console.error("Error exporting session:", error);
      res.status(500).json({ message: "Failed to export session" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}

// Helper functions
async function ensureDirectoryExists(dirPath: string) {
  try {
    await fs.access(dirPath);
  } catch {
    await fs.mkdir(dirPath, { recursive: true });
  }
}

async function generateLabeledImage(image: any, annotations: any[], outputPath: string) {
  try {
    // Dynamic import for canvas to avoid ES module issues
    const { createCanvas, loadImage } = await import('canvas');
    
    // Ensure the labeled directory exists
    await ensureDirectoryExists(path.dirname(outputPath));
    
    // Load the original image
    const imageBuffer = await fs.readFile(image.filePath);
    const img = await loadImage(imageBuffer);

    // Create canvas
    const canvas = createCanvas(img.width, img.height);
    const ctx = canvas.getContext('2d');

    // Draw the original image
    ctx.drawImage(img, 0, 0);

    // Draw annotations
    annotations.forEach(annotation => {
      const bbox = annotation.boundingBox as any;

      // Draw bounding box
      ctx.strokeStyle = "#1976D2";
      ctx.lineWidth = Math.max(3, Math.floor(img.width / 400));
      ctx.strokeRect(bbox.x, bbox.y, bbox.width, bbox.height);

      // Calculate font size based on image size
      const fontSize = Math.max(16, Math.floor(img.width / 50));
      ctx.font = `bold ${fontSize}px Arial`;
      
      // Measure text for background sizing
      const textMetrics = ctx.measureText(annotation.category);
      const paddingX = Math.floor(fontSize * 0.5);
      const paddingY = Math.floor(fontSize * 0.25);
      const backgroundHeight = fontSize + (paddingY * 2);
      const backgroundWidth = textMetrics.width + (paddingX * 2);

      // Draw label background
      ctx.fillStyle = "#1976D2";
      ctx.fillRect(
        bbox.x, 
        bbox.y - backgroundHeight, 
        backgroundWidth,
        backgroundHeight
      );

      // Draw label text
      ctx.fillStyle = "white";
      ctx.textBaseline = "top";
      ctx.fillText(annotation.category, bbox.x + paddingX, bbox.y - backgroundHeight + paddingY);
    });

    // Save the labeled image
    const labeledBuffer = canvas.toBuffer('image/png');
    await fs.writeFile(outputPath, labeledBuffer);
    
    console.log(`Generated labeled image: ${outputPath}`);
  } catch (error) {
    console.error(`Error generating labeled image for ${image.fileName}:`, error);
    throw error;
  }
}

async function extractZipImages(zipPath: string, projectDir: string) {
  const zipBuffer = await fs.readFile(zipPath);
  const zip = await JSZip.loadAsync(zipBuffer);
  const images = [];

  for (const [relativePath, file] of Object.entries(zip.files)) {
    if (!file.dir && relativePath.match(/\.(jpg|jpeg|png|gif|bmp|webp)$/i)) {
      const fileName = `${Date.now()}-${path.basename(relativePath)}`;
      const filePath = path.join(projectDir, "images", "original", fileName);

      const buffer = await file.async("nodebuffer");
      await fs.writeFile(filePath, buffer);

      images.push({
        originalName: path.basename(relativePath),
        fileName,
        filePath,
      });
    }
  }

  return images;
}

function generateFormCSV(formData: any[]): string {
  const headers = ["Section", "Field", "Value", "Updated At"];
  
  // Define all possible sections and their fields
  const allSections = {
    "product_info": ["date", "orderNumber", "warehouse"],
    "auth1": ["damagePresent", "damageDetails", "imageCount"],
    "auth2": ["packagingCondition", "sealIntact", "additionalNotes"],
    "regional": ["region", "shippingMethod", "deliveryDate"],
    "feedback": ["overallRating", "comments", "wouldRecommend"]
  };
  
  // Create a map of existing form data for quick lookup
  const existingData = new Map();
  formData.forEach(field => {
    const key = `${field.section}.${field.fieldName}`;
    existingData.set(key, field);
  });
  
  // Generate rows for all possible fields
  const rows = [];
  for (const [section, fields] of Object.entries(allSections)) {
    for (const field of fields) {
      const key = `${section}.${field}`;
      const existingField = existingData.get(key);
      
      rows.push([
        section,
        field,
        existingField?.fieldValue || "",
        existingField?.updatedAt?.toISOString() || "",
      ]);
    }
  }

  return [headers, ...rows].map(row => 
    row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(",")
  ).join("\n");
}

async function generateFormExcel(formData: any[], productNumber: string): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("Authentication Form");

  // Add headers
  worksheet.addRow(["Section", "Field", "Value", "Updated At"]);

  // Style headers
  const headerRow = worksheet.getRow(1);
  headerRow.font = { bold: true };
  headerRow.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFE0E0E0" },
  };

  // Add data
  formData.forEach(field => {
    worksheet.addRow([
      field.section,
      field.fieldName,
      field.fieldValue || "",
      field.updatedAt?.toISOString() || "",
    ]);
  });

  // Auto-fit columns
  worksheet.columns.forEach(column => {
    column.width = 20;
  });

  return await workbook.xlsx.writeBuffer() as Buffer;
}