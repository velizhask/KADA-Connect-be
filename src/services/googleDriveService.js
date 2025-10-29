const { google } = require('googleapis');

class GoogleDriveService {
  constructor() {
    this.auth = null;
    this.drive = null;
    this.initializeAuth();
  }

  /**
   * Initialize Google Drive authentication
   */
  initializeAuth() {
    try {
      const credentials = {
        client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
        private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        project_id: process.env.GOOGLE_PROJECT_ID
      };

      if (!credentials.client_email || !credentials.private_key) {
        console.warn('Google Drive credentials not found. Google Drive URLs will not be processed.');
        return;
      }

      this.auth = new google.auth.JWT(
        credentials.client_email,
        null,
        credentials.private_key,
        ['https://www.googleapis.com/auth/drive.readonly']
      );

      this.drive = google.drive({ version: 'v3', auth: this.auth });
    } catch (error) {
      console.error('Error initializing Google Drive auth:', error);
    }
  }

  /**
   * Extract file ID from Google Drive share URL
   * @param {string} url - Google Drive share URL
   * @returns {string|null} - File ID or null if not found
   */
  extractFileId(url) {
    if (!url) return null;

    // Handle different Google Drive URL formats
    const patterns = [
      /\/file\/d\/([a-zA-Z0-9_-]+)/,  // https://drive.google.com/file/d/FILE_ID/view
      /id=([a-zA-Z0-9_-]+)/,          // https://drive.google.com/open?id=FILE_ID
      /\/d\/([a-zA-Z0-9_-]+)/         // https://drive.google.com/d/FILE_ID/view
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) {
        return match[1];
      }
    }

    return null;
  }

  /**
   * Check if URL is a Google Drive share URL
   * @param {string} url - URL to check
   * @returns {boolean} - True if Google Drive share URL
   */
  isGoogleDriveUrl(url) {
    if (!url) return false;
    return url.includes('drive.google.com') && this.extractFileId(url) !== null;
  }

  /**
   * Get direct download URL for Google Drive file
   * @param {string} shareUrl - Google Drive share URL
   * @returns {Promise<string|null>} - Direct download URL or null if failed
   */
  async getDirectDownloadUrl(shareUrl) {
    if (!this.drive) {
      console.warn('Google Drive service not initialized');
      return null;
    }

    try {
      const fileId = this.extractFileId(shareUrl);
      if (!fileId) {
        throw new Error('Invalid Google Drive URL format');
      }

      // Get file metadata to ensure it's accessible
      const file = await this.drive.files.get({
        fileId: fileId,
        fields: 'id, name, mimeType, size, webViewLink'
      });

      // Generate direct download URL
      const directUrl = `https://drive.google.com/uc?export=download&id=${fileId}`;

      console.log(`Generated direct URL for file: ${file.data.name}`);
      return directUrl;

    } catch (error) {
      console.error('Error getting direct download URL:', error.message);
      console.error('Google Drive API error details:', {
        code: error.code,
        status: error.status,
        message: error.message,
        errors: error.errors
      });

      // Handle specific Google Drive API errors
      if (error.code === 404) {
        throw new Error(`File not found or access denied (404). Ensure the file exists and is shared with service account: ${this.auth?.client?.email}`);
      } else if (error.code === 403) {
        throw new Error(`Access denied (403). File may not be publicly accessible or service account lacks permissions. Service account: ${this.auth?.client?.email}`);
      } else if (error.code === 500) {
        throw new Error(`Google Drive internal error (500). This often indicates file permission issues or temporary Google service problems.`);
      } else if (error.code === 429) {
        throw new Error('Rate limit exceeded (429). Too many requests to Google Drive API.');
      } else {
        throw new Error(`Google Drive API error (${error.code}): ${error.message}`);
      }

      return null;
    }
  }

  /**
   * Download file content as buffer
   * @param {string} shareUrl - Google Drive share URL
   * @returns {Promise<Buffer|null>} - File content as buffer or null if failed
   */
  async downloadFile(shareUrl) {
    if (!this.drive) {
      console.warn('Google Drive service not initialized');
      return null;
    }

    try {
      const fileId = this.extractFileId(shareUrl);
      if (!fileId) {
        throw new Error('Invalid Google Drive URL format');
      }

      const response = await this.drive.files.get({
        fileId: fileId,
        alt: 'media'
      }, {
        responseType: 'stream'
      });

      return response.data;
    } catch (error) {
      console.error('Error downloading file:', error.message);
      return null;
    }
  }

  /**
   * Get file metadata
   * @param {string} shareUrl - Google Drive share URL
   * @returns {Promise<Object|null>} - File metadata or null if failed
   */
  async getFileMetadata(shareUrl) {
    if (!this.drive) {
      console.warn('Google Drive service not initialized');
      return null;
    }

    try {
      const fileId = this.extractFileId(shareUrl);
      if (!fileId) {
        throw new Error('Invalid Google Drive URL format');
      }

      const file = await this.drive.files.get({
        fileId: fileId,
        fields: 'id, name, mimeType, size, createdTime, modifiedTime'
      });

      return file.data;
    } catch (error) {
      console.error('Error getting file metadata:', error.message);
      return null;
    }
  }

  /**
   * Check if service is properly initialized
   * @returns {boolean} - True if service is ready
   */
  isReady() {
    return this.auth !== null && this.drive !== null;
  }
}

module.exports = new GoogleDriveService();