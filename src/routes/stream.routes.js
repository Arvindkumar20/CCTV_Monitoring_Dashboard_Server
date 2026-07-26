import express from "express";
import { streamService } from "../services/stream.service.js";
import Camera from "../models/camera.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { successResponse } from "../utils/response.js";
import AppError from "../utils/AppError.js";
import { authenticateGuardian } from "../middlewares/auth.middleware.js";

const router = express.Router();

// All stream routes require guardian authentication
router.use(authenticateGuardian);

// Get all available streams for logged-in guardian
router.get("/", asyncHandler(async (req, res) => {
  const guardian = req.guardian;
  
  // Get cameras in guardian's hierarchy
  const cameras = await Camera.find({
    $or: [
      { mainCategoryId: guardian.Class },
      { subCategoryId: guardian.section },
      { subSubCategoryId: guardian.group }
    ].filter(Boolean)
  });

  const streams = [];
  for (const camera of cameras) {
    const streamInfo = streamService.getGuardianStreams(guardian._id)
      .find(s => s.cameraId.toString() === camera._id.toString());
    
    streams.push({
      cameraId: camera._id,
      cameraName: camera.name,
      streamKey: streamInfo?.streamKey,
      streamUrl: streamInfo?.streamUrl,
      hlsUrl: streamInfo?.hlsUrl,
      webrtcUrl: streamInfo?.webrtcUrl,
      status: camera.streamStatus,
      isActive: !!streamInfo
    });
  }

  successResponse(res, "Streams fetched successfully", streams);
}));

// Start a specific camera stream
router.post("/start/:cameraId", asyncHandler(async (req, res) => {
  const guardian = req.guardian;
  const camera = await Camera.findById(req.params.cameraId);
  
  if (!camera) {
    throw new AppError("Camera not found", 404);
  }

  // Verify guardian has access to this camera
  const hasAccess = await guardianService.verifyCameraAccess(guardian._id, camera._id);
  if (!hasAccess) {
    throw new AppError("Access denied to this camera", 403);
  }

  const streamConfig = await streamService.startStream(guardian, camera);
  
  successResponse(res, "Stream started successfully", streamConfig);
}));

// Stop a stream
router.post("/stop/:streamKey", asyncHandler(async (req, res) => {
  const { streamKey } = req.params;
  const guardian = req.guardian;
  
  const stream = streamService.getStreamStatus(streamKey);
  if (!stream || stream.guardianId.toString() !== guardian._id.toString()) {
    throw new AppError("Stream not found", 404);
  }

  await streamService.stopStream(streamKey);
  successResponse(res, "Stream stopped successfully");
}));

// Get stream status
router.get("/status/:streamKey", asyncHandler(async (req, res) => {
  const { streamKey } = req.params;
  const guardian = req.guardian;
  
  const stream = streamService.getStreamStatus(streamKey);
  if (!stream || stream.guardianId.toString() !== guardian._id.toString()) {
    throw new AppError("Stream not found", 404);
  }

  streamService.updateStreamAccess(streamKey);
  successResponse(res, "Stream status fetched", stream);
}));

// HLS playback endpoint
router.get("/hls/:streamKey/index.m3u8", asyncHandler(async (req, res) => {
  const { streamKey } = req.params;
  const stream = streamService.getStreamStatus(streamKey);
  
  if (!stream) {
    throw new AppError("Stream not found", 404);
  }

  // Here you would serve the actual HLS playlist from MediaMTX
  // For now, redirect to MediaMTX HLS endpoint
  res.redirect(`http://localhost:8888/${streamKey}/index.m3u8`);
}));

// WebRTC playback endpoint
router.get("/webrtc/:streamKey", asyncHandler(async (req, res) => {
  const { streamKey } = req.params;
  const stream = streamService.getStreamStatus(streamKey);
  
  if (!stream) {
    throw new AppError("Stream not found", 404);
  }

  // Return WebRTC configuration
  res.json({
    webrtcUrl: stream.webrtcUrl,
    iceServers: [
      { urls: "stun:stun.l.google.com:19302" },
      { urls: "stun:stun1.l.google.com:19302" }
    ]
  });
}));

export const streamRouter= router;