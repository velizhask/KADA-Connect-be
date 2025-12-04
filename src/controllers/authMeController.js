const { supabase } = require('../db');
const studentService = require('../services/studentService');
const companyService = require('../services/companyService');
const fileService = require('../services/fileService');

/**
 * Get current user's profile
 * Automatically detects user role (student or company) and returns appropriate profile
 */
const getProfile = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const role = req.user.role;

    let profile = null;

    if (role === 'student') {
      // Fetch raw student data and transform with full data (including phone)
      const { data, error } = await supabase
        .from('students')
        .select(`
          id,
          "full_name",
          status,
          employment_status,
          university_institution,
          program_major,
          preferred_industry,
          tech_stack_skills,
          self_introduction,
          cv_upload,
          profile_photo,
          linkedin,
          portfolio_link,
          phone_number,
          batch,
          "timestamp"
        `)
        .eq('id', userId)
        .single();

      if (error || !data) {
        return res.status(404).json({
          success: false,
          message: 'Profile not found'
        });
      }

      profile = studentService.transformStudentData(data);
    } else if (role === 'company') {
      // Fetch raw company data and transform with full data
      const { data, error } = await supabase
        .from('companies')
        .select(`
          id,
          company_name,
          company_summary_description,
          industry_sector,
          company_website_link,
          company_logo,
          tech_roles_interest,
          preferred_skillsets,
          contact_person_name,
          contact_email,
          contact_phone_number,
          contact_info_visible,
          "timestamp"
        `)
        .eq('id', userId)
        .single();

      if (error || !data) {
        return res.status(404).json({
          success: false,
          message: 'Profile not found'
        });
      }

      profile = companyService.transformCompanyData(data);
    } else {
      return res.status(400).json({
        success: false,
        message: 'Invalid role. Must be student or company.'
      });
    }

    res.json({
      success: true,
      data: profile
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update current user's profile
 * Automatically detects user role and updates appropriate profile
 */
const updateProfile = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const role = req.user.role;
    const updateData = req.body;

    let profile = null;

    if (role === 'student') {
      // Use patchStudent for partial updates to avoid nulling other fields
      profile = await studentService.patchStudent(userId, updateData, req);
    } else if (role === 'company') {
      // Use patchCompany for partial updates to avoid nulling other fields
      profile = await companyService.patchCompany(userId, updateData, req);
    } else {
      return res.status(400).json({
        success: false,
        message: 'Invalid role. Must be student or company.'
      });
    }

    if (!profile) {
      return res.status(404).json({
        success: false,
        message: 'Profile not found'
      });
    }

    res.json({
      success: true,
      data: profile,
      message: 'Profile updated successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Upload CV file for current student user
 */
const uploadCV = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const role = req.user.role;

    // Ensure only students can upload CVs
    if (role !== 'student') {
      return res.status(403).json({
        success: false,
        message: 'Only students can upload CVs'
      });
    }

    const file = req.file;

    if (!file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    // Upload to file service
    const fileRecord = await fileService.uploadFile(file, {
      bucket: 'student-cvs',
      userId,
      fileType: 'cv',
      studentId: userId
    });

    console.log('[UPLOAD] File uploaded successfully:', fileRecord);
    console.log('[UPLOAD] Attempting to update student record with CV URL:', fileRecord.url);
    console.log('[UPLOAD] Student ID to update:', userId);
    console.log('[UPLOAD] Update data:', { cvUpload: fileRecord.url });

    // Update student record with CV file URL (partial update to avoid nulling other fields)
    const updatedStudent = await studentService.patchStudent(userId, {
      cvUpload: fileRecord.url
    }, req);

    console.log('[UPLOAD] Student update result:', updatedStudent);
    console.log('[UPLOAD] Type of updatedStudent:', typeof updatedStudent);
    console.log('[UPLOAD] Is updatedStudent null?', updatedStudent === null);

    if (!updatedStudent) {
      console.error('[ERROR] Failed to update student record - updateStudent returned null');
      throw new Error('Failed to update student record with CV URL');
    }

    res.json({
      success: true,
      message: 'CV uploaded successfully',
      data: {
        file: fileRecord
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Upload profile photo for current student user
 */
const uploadPhoto = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const role = req.user.role;

    // Ensure only students can upload photos
    if (role !== 'student') {
      return res.status(403).json({
        success: false,
        message: 'Only students can upload profile photos'
      });
    }

    const file = req.file;

    if (!file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    // Upload to file service
    const fileRecord = await fileService.uploadFile(file, {
      bucket: 'student-photos',
      userId,
      fileType: 'photo',
      studentId: userId
    });

    console.log('[UPLOAD] Photo uploaded successfully:', fileRecord);
    console.log('[UPLOAD] Attempting to update student record with photo URL:', fileRecord.url);
    console.log('[UPLOAD] Student ID to update:', userId);
    console.log('[UPLOAD] Update data:', { profilePhoto: fileRecord.url });

    // Update student record with photo URL (partial update to avoid nulling other fields)
    const updatedStudent = await studentService.patchStudent(userId, {
      profilePhoto: fileRecord.url
    }, req);

    console.log('[UPLOAD] Student update result:', updatedStudent);
    console.log('[UPLOAD] Type of updatedStudent:', typeof updatedStudent);
    console.log('[UPLOAD] Is updatedStudent null?', updatedStudent === null);

    if (!updatedStudent) {
      console.error('[ERROR] Failed to update student record - updateStudent returned null');
      throw new Error('Failed to update student record with photo URL');
    }

    res.json({
      success: true,
      message: 'Profile photo uploaded successfully',
      data: {
        file: fileRecord
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Upload company logo for current company user
 */
const uploadLogo = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const role = req.user.role;

    // Ensure only companies can upload logos
    if (role !== 'company') {
      return res.status(403).json({
        success: false,
        message: 'Only companies can upload logos'
      });
    }

    const file = req.file;

    if (!file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    // Upload to file service
    const fileRecord = await fileService.uploadFile(file, {
      bucket: 'company-logos',
      userId,
      fileType: 'logo',
      companyId: userId
    });

    console.log('[UPLOAD] Logo uploaded successfully:', fileRecord);
    console.log('[UPLOAD] Attempting to update company record with logo URL:', fileRecord.url);
    console.log('[UPLOAD] Company ID to update:', userId);
    console.log('[UPLOAD] Update data:', { logo: fileRecord.url });

    // Update company record with logo URL (partial update to avoid nulling other fields)
    const updatedCompany = await companyService.patchCompany(userId, {
      logo: fileRecord.url
    }, req);

    console.log('[UPLOAD] Company update result:', updatedCompany);
    console.log('[UPLOAD] Type of updatedCompany:', typeof updatedCompany);
    console.log('[UPLOAD] Is updatedCompany null?', updatedCompany === null);

    if (!updatedCompany) {
      console.error('[ERROR] Failed to update company record - updateCompany returned null');
      throw new Error('Failed to update company record with logo URL');
    }

    res.json({
      success: true,
      message: 'Company logo uploaded successfully',
      data: {
        file: fileRecord
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getProfile,
  updateProfile,
  uploadCV,
  uploadPhoto,
  uploadLogo
};
