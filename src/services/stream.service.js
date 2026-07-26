import { exec } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class StreamService {
  constructor() {
    this.mediamtxPath = process.env.MEDIAMTX_PATH || '/usr/local/bin/mediamtx';
    this.configPath = process.env.MEDIAMTX_CONFIG || path.join(__dirname, '../../config/mediamtx.yml');
    this.streamsDir = process.env.STREAMS_DIR || path.join(__dirname, '../../streams');
    this.activeStreams = new Map(); // Track active streams
    
    // Ensure streams directory exists
    if (!fs.existsSync(this.streamsDir)) {
      fs.mkdirSync(this.streamsDir, { recursive: true });
    }
  }

  /**
   * Generate a unique stream key for a guardian
   */
  generateStreamKey(guardianId, cameraId) {
    const timestamp = Date.now();
    const random = crypto.randomBytes(8).toString('hex');
    return `${guardianId}_${cameraId}_${timestamp}_${random}`;
  }

  /**
   * Create stream configuration for MediaMTX
   */
  async createStreamConfig(guardian, camera) {
    const streamKey = this.generateStreamKey(guardian._id, camera._id);
    const streamPath = path.join(this.streamsDir, streamKey);
    
    const config = {
      name: `${guardian.guardianName}_${camera.name}`,
      source: camera.rtspUrl,
      sourceOnDemand: true,
      sourceProtocol: 'tcp',
      record: false,
      runOnInit: `mkdir -p ${streamPath}`,
      runOnDemand: `echo "Stream started for ${camera.name}"`,
      runOnDemandClose: `echo "Stream ended for ${camera.name}"`,
      authentication: true,
      publishUser: guardian._id.toString(),
      publishPass: streamKey
    };

    // Save config to file
    const configFile = path.join(this.streamsDir, `${streamKey}.json`);
    fs.writeFileSync(configFile, JSON.stringify(config, null, 2));

    return {
      streamKey,
      streamUrl: `rtsp://localhost:8554/${streamKey}`,
      hlsUrl: `http://localhost:8888/${streamKey}/index.m3u8`,
      webrtcUrl: `http://localhost:8889/${streamKey}/webrtc`,
      config
    };
  }

  /**
   * Start a stream for a camera
   */
  async startStream(guardian, camera) {
    try {
      const streamConfig = await this.createStreamConfig(guardian, camera);
      
      // Add to active streams
      this.activeStreams.set(streamConfig.streamKey, {
        guardianId: guardian._id,
        cameraId: camera._id,
        cameraName: camera.name,
        streamKey: streamConfig.streamKey,
        streamUrl: streamConfig.streamUrl,
        hlsUrl: streamConfig.hlsUrl,
        webrtcUrl: streamConfig.webrtcUrl,
        startedAt: new Date(),
        lastAccessed: new Date()
      });

      // Here you would typically call MediaMTX API to start the stream
      // For now, we'll simulate it
      console.log(`🎥 Stream started for ${camera.name}: ${streamConfig.streamUrl}`);

      return streamConfig;
    } catch (error) {
      console.error('Failed to start stream:', error);
      throw new Error('Stream could not be started');
    }
  }

  /**
   * Stop a stream
   */
  async stopStream(streamKey) {
    const stream = this.activeStreams.get(streamKey);
    if (stream) {
      // Clean up config file
      const configFile = path.join(this.streamsDir, `${streamKey}.json`);
      if (fs.existsSync(configFile)) {
        fs.unlinkSync(configFile);
      }
      
      this.activeStreams.delete(streamKey);
      console.log(`🛑 Stream stopped: ${streamKey}`);
    }
  }

  /**
   * Get stream status
   */
  getStreamStatus(streamKey) {
    return this.activeStreams.get(streamKey) || null;
  }

  /**
   * Get all active streams for a guardian
   */
  getGuardianStreams(guardianId) {
    const streams = [];
    for (const [key, stream] of this.activeStreams) {
      if (stream.guardianId.toString() === guardianId.toString()) {
        streams.push(stream);
      }
    }
    return streams;
  }

  /**
   * Update last accessed time for stream
   */
  updateStreamAccess(streamKey) {
    const stream = this.activeStreams.get(streamKey);
    if (stream) {
      stream.lastAccessed = new Date();
      this.activeStreams.set(streamKey, stream);
    }
  }

  /**
   * Clean up old streams (run as cron job)
   */
  cleanupOldStreams(maxAgeHours = 24) {
    const now = new Date();
    for (const [key, stream] of this.activeStreams) {
      const hoursSinceLastAccess = (now - stream.lastAccessed) / (1000 * 60 * 60);
      if (hoursSinceLastAccess > maxAgeHours) {
        this.stopStream(key);
      }
    }
  }
}

export const streamService = new StreamService();