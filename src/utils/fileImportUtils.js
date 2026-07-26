// utils/fileImportUtils.js
import { Readable } from "stream";
import csv from "csv-parser";
import * as xlsx from "xlsx";

/**
 * Normalize field names from Excel/CSV to match database fields
 * Handles different column name variations
 */
export const normalizeFieldNames = (rawData) => {
  const normalized = [];
  
  // Field mapping rules
  const fieldMappings = {
    guardianName: ['guardianname', 'guardian name', 'guardian_name', 'parent name', 'parentname', 'name of guardian'],
    mobile: ['mobile', 'phone', 'contact', 'phone number', 'mobile number', 'contact number', 'phone_no'],
    email: ['email', 'e-mail', 'email address', 'email_id', 'mail'],
    studentName: ['studentname', 'student name', 'student_name', 'child name', 'childname'],
    dob: ['dob', 'date of birth', 'birth date', 'date_of_birth', 'birthday', 'dob (dd-mm-yyyy)'],
    class: ['class', 'grade', 'standard', 'class_', 'grade_level', 'class/grade'],
    section: ['section', 'division', 'sec', 'section_', 'class section'],
    group: ['group', 'stream', 'subject group', 'academic group', 'group_'],
    relationship: ['relationship', 'relation', 'guardian relation']
  };

  // Process each record
  for (const record of rawData) {
    const normalizedRecord = {};
    
    // Create lowercase version of all keys for case-insensitive matching
    const lowerCaseRecord = {};
    Object.keys(record).forEach(key => {
      lowerCaseRecord[key.toLowerCase().trim()] = record[key];
    });

    // Map fields based on rules
    Object.keys(fieldMappings).forEach(targetField => {
      const possibleKeys = fieldMappings[targetField];
      for (const key of possibleKeys) {
        if (lowerCaseRecord[key] !== undefined) {
          normalizedRecord[targetField] = lowerCaseRecord[key];
          break;
        }
      }
    });

    // Keep original data for reference
    normalizedRecord._original = record;
    normalized.push(normalizedRecord);
  }

  return normalized;
};

/**
 * Parse date from various formats
 * Supports: DD-MM-YYYY, DD/MM/YYYY, YYYY-MM-DD, Excel serial numbers
 */
export const parseDate = (dateValue) => {
  if (!dateValue) return null;
  
  // Agar already Date object hai
  if (dateValue instanceof Date) return dateValue;
  
  const str = String(dateValue).trim();
  
  // Pattern 1: DD-MM-YYYY ya DD/MM/YYYY
  const dmyPattern = /^(\d{1,2})[-\/](\d{1,2})[-\/](\d{4})$/;
  let match = str.match(dmyPattern);
  if (match) {
    const [_, day, month, year] = match;
    return new Date(`${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`);
  }
  
  // Pattern 2: YYYY-MM-DD ya YYYY/MM/DD
  const ymdPattern = /^(\d{4})[-\/](\d{1,2})[-\/](\d{1,2})$/;
  match = str.match(ymdPattern);
  if (match) {
    const [_, year, month, day] = match;
    return new Date(`${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`);
  }
  
  // Pattern 3: Excel serial number (like 44562)
  if (/^\d+$/.test(str)) {
    const excelEpoch = new Date(1899, 11, 30);
    const days = parseInt(str);
    return new Date(excelEpoch.getTime() + days * 24 * 60 * 60 * 1000);
  }
  
  // Last resort: try native Date parsing
  const date = new Date(str);
  if (!isNaN(date.getTime())) return date;
  
  return null;
};

/**
 * Validate and clean Indian mobile number
 */
export const cleanMobile = (mobile) => {
  if (!mobile) return null;
  
  // Remove spaces, +91, 0 prefix
  const cleaned = mobile.toString()
    .replace(/\s+/g, '')
    .replace(/^\+91/, '')
    .replace(/^0/, '');
  
  // Check if it's a valid Indian mobile (10 digits starting with 6-9)
  if (/^[6-9]\d{9}$/.test(cleaned)) {
    return cleaned;
  }
  
  return null;
};

/**
 * Generate email from name if not provided
 */
export const generateEmail = (name, existingEmail = null) => {
  if (existingEmail) return existingEmail.toLowerCase();
  
  // Create email from name
  const emailName = name.toLowerCase()
    .replace(/\s+/g, '.')
    .replace(/[^a-z.]/g, '');
  
  // Add random number to avoid duplicates
  const randomNum = Math.floor(Math.random() * 1000);
  return `${emailName}${randomNum}@temp.com`;
};

/**
 * Parse Excel file and return JSON
 */
export const parseExcelFile = (fileBuffer) => {
  const workbook = xlsx.read(fileBuffer, { type: "buffer" });
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  return xlsx.utils.sheet_to_json(worksheet);
};

/**
 * Parse CSV file and return JSON
 */
export const parseCSVFile = async (fileBuffer) => {
  const stream = Readable.from(fileBuffer.toString());
  const results = [];
  
  await new Promise((resolve, reject) => {
    stream.pipe(csv())
      .on("data", (data) => results.push(data))
      .on("end", resolve)
      .on("error", reject);
  });
  
  return results;
};

/**
 * Validate required fields in a record
 */
export const validateRecord = (record) => {
  const errors = [];
  
  if (!record.guardianName) errors.push("Guardian Name is required");
  if (!record.mobile) errors.push("Mobile number is required");
  else {
    const cleanedMobile = cleanMobile(record.mobile);
    if (!cleanedMobile) errors.push("Invalid mobile number format");
  }
  if (!record.studentName) errors.push("Student Name is required");
  if (!record.dob) errors.push("Date of Birth is required");
  else {
    const parsedDate = parseDate(record.dob);
    if (!parsedDate) errors.push("Invalid date format");
  }
  if (!record.class) errors.push("Class is required");
  
  return {
    isValid: errors.length === 0,
    errors
  };
};