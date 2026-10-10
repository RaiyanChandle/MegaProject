import multer from 'multer';
import { uploadBufferToCloudinary } from '../config/cloudinary.js';

// Allowed MIME types and extensions
export const DEFAULT_ALLOWED_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain',
  'application/zip',
  'application/x-zip-compressed',
  'image/jpeg',
  'image/png',
  'image/webp'
];

export const DEFAULT_MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

/**
 * Creates a file filter function for Multer
 */
const createFileFilter = (allowedTypes = DEFAULT_ALLOWED_TYPES) => {
  return (req, file, cb) => {
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Invalid file type (${file.mimetype}). Allowed types: PDF, Word, Excel, PowerPoint, Text, ZIP, and Images.`));
    }
  };
};

/**
 * Configure Multer in-memory storage
 */
const storage = multer.memoryStorage();

/**
 * General purpose upload middleware factory
 * @param {Object} options
 * @param {string} options.fieldName - Name of the multipart form field (default: 'file')
 * @param {number} options.maxSize - Maximum file size in bytes (default: 10MB)
 * @param {string[]} options.allowedTypes - Array of allowed MIME types
 * @param {string} options.folder - Destination folder in Cloudinary (e.g. 'nexus/notes', 'nexus/assignments')
 * @param {boolean} options.isOptional - Whether the file is optional (default: false)
 */
export const createUploadMiddleware = ({
  fieldName = 'file',
  maxSize = DEFAULT_MAX_FILE_SIZE,
  allowedTypes = DEFAULT_ALLOWED_TYPES,
  folder = 'nexus/uploads',
  isOptional = false
} = {}) => {
  const upload = multer({
    storage,
    limits: { fileSize: maxSize },
    fileFilter: createFileFilter(allowedTypes)
  }).single(fieldName);

  return (req, res, next) => {
    upload(req, res, async (err) => {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          const limitMb = Math.round(maxSize / (1024 * 1024));
          return res.status(400).json({ error: `File size exceeds the maximum limit of ${limitMb}MB.` });
        }
        return res.status(400).json({ error: `Upload error: ${err.message}` });
      } else if (err) {
        return res.status(400).json({ error: err.message });
      }

      // Check if file is required but missing
      if (!req.file) {
        if (isOptional) {
          return next();
        }
        return res.status(400).json({ error: `Please provide a file in the '${fieldName}' field.` });
      }

      try {
        // Stream the memory buffer directly to Cloudinary
        const cloudinaryResult = await uploadBufferToCloudinary(req.file.buffer, {
          folder,
          resource_type: 'auto',
          // Preserve original filename without dangerous chars
          public_id: `${Date.now()}-${req.file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_')}`
        });

        // Attach Cloudinary result to request for controller use
        req.fileUrl = cloudinaryResult.secure_url;
        req.filePublicId = cloudinaryResult.public_id;
        req.fileResult = cloudinaryResult;

        next();
      } catch (uploadError) {
        console.error('Cloudinary stream error:', uploadError);
        return res.status(502).json({ error: 'Failed to upload file to Cloudinary storage service.' });
      }
    });
  };
};

/**
 * Pre-configured upload middlewares for Phase 8 & beyond
 */
export const uploadNoteMiddleware = createUploadMiddleware({
  fieldName: 'file',
  folder: 'nexus/notes',
  maxSize: 15 * 1024 * 1024 // 15MB
});

export const uploadLibraryMiddleware = createUploadMiddleware({
  fieldName: 'file',
  folder: 'nexus/library',
  maxSize: 25 * 1024 * 1024 // 25MB
});

export const uploadAssignmentMiddleware = createUploadMiddleware({
  fieldName: 'file',
  folder: 'nexus/assignments',
  maxSize: 15 * 1024 * 1024, // 15MB
  isOptional: true // Assignments can be created with or without an attached PDF
});

export const uploadSubmissionMiddleware = createUploadMiddleware({
  fieldName: 'file',
  folder: 'nexus/submissions',
  maxSize: 20 * 1024 * 1024 // 20MB
});
