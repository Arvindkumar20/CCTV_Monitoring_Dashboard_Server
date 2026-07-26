// controllers/guardian.controller.js
import { catchAsync } from "../utils/catchAsync.js";
import { successResponse } from "../utils/apiResponse.js";
import guardianService from "../services/guardian.service.js";
import AppError from "../utils/appError.js";

// Create guardian
export const createGuardian = catchAsync(async (req, res) => {
  const guardian = await guardianService.createGuardian(
    req.body,
    req.user.userId,
    {
      ipAddress: req.ip,
      userAgent: req.get("user-agent"),
      deviceInfo: req.body.deviceInfo,
    }
  );

  return successResponse(res, "Guardian created successfully", { guardian }, 201);
});

// Get all guardians
export const getAllGuardians = catchAsync(async (req, res) => {
  const { guardians, pagination } = await guardianService.getAllGuardians(
    req.query,
    { page: req.query.page, limit: req.query.limit },
    req.user.userId
  );

  return successResponse(res, "Guardians fetched successfully", {
    guardians,
    pagination,
  });
});

// Get guardian by ID
export const getGuardianById = catchAsync(async (req, res) => {
  const guardian = await guardianService.getGuardianById(req.params.id);

  return successResponse(res, "Guardian fetched successfully", { guardian });
});

// Update guardian
export const updateGuardian = catchAsync(async (req, res) => {
  const guardian = await guardianService.updateGuardian(
    req.params.id,
    req.body,
    req.user.userId
  );

  return successResponse(res, "Guardian updated successfully", { guardian });
});

// Delete guardian
export const deleteGuardian = catchAsync(async (req, res) => {
  const result = await guardianService.deleteGuardian(req.params.id);

  return successResponse(res, "Guardian deleted successfully", result);
});

// Bulk delete guardians
export const bulkDeleteGuardians = catchAsync(async (req, res) => {
  const result = await guardianService.bulkDeleteGuardians(req.body.ids);

  return successResponse(res, "Guardians deleted successfully", result);
});

// Toggle guardian status
export const toggleGuardianStatus = catchAsync(async (req, res) => {
  const guardian = await guardianService.toggleStatus(req.params.id, req.user.userId);

  return successResponse(res, `Guardian ${guardian.status} successfully`, { guardian });
});

// Unlock guardian account
export const unlockGuardianAccount = catchAsync(async (req, res) => {
  const guardian = await guardianService.unlockAccount(req.params.id, req.user.userId);

  return successResponse(res, "Guardian account unlocked successfully", { guardian });
});

// Get guardian students
export const getGuardianStudents = catchAsync(async (req, res) => {
  const students = await guardianService.getGuardianStudents(req.params.id);

  return successResponse(res, "Students fetched successfully", { students });
});

// Add student to guardian
export const addStudentToGuardian = catchAsync(async (req, res) => {
  const student = await guardianService.addStudent(
    req.params.id,
    req.body,
    req.user.userId
  );

  return successResponse(res, "Student added to guardian successfully", { student }, 201);
});

// Remove student from guardian
export const removeStudentFromGuardian = catchAsync(async (req, res) => {
  const result = await guardianService.removeStudent(req.params.id, req.params.studentId);

  return successResponse(res, "Student removed from guardian successfully", result);
});

// Get guardian login history
export const getGuardianLoginHistory = catchAsync(async (req, res) => {
  const { history, pagination } = await guardianService.getLoginHistory(
    req.params.id,
    { page: req.query.page, limit: req.query.limit }
  );

  return successResponse(res, "Login history fetched successfully", {
    history,
    pagination,
  });
});

// Get guardian devices
export const getGuardianDevices = catchAsync(async (req, res) => {
  const devices = await guardianService.getDevices(req.params.id);

  return successResponse(res, "Devices fetched successfully", { devices });
});

// Remove guardian device
export const removeGuardianDevice = catchAsync(async (req, res) => {
  const result = await guardianService.removeDevice(req.params.id, req.params.deviceId);

  return successResponse(res, "Device removed successfully", result);
});

// Reset guardian password
export const resetGuardianPassword = catchAsync(async (req, res) => {
  const result = await guardianService.resetPassword(
    req.params.id,
    req.body.password,
    req.user.userId
  );

  return successResponse(res, "Password reset successfully", result);
});

// Get guardian statistics
export const getGuardianStatistics = catchAsync(async (req, res) => {
  const statistics = await guardianService.getStatistics();

  return successResponse(res, "Statistics fetched successfully", { statistics });
});