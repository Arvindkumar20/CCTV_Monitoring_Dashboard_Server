// // controllers/settingsController.js
// import { Settings } from "../models/Settings.model.js";
// import { settingsService } from "../services/settings.service.js";

// export const settingsController = {
//   async createSettings(req, res) {
//     try {
//       const schoolId = req.user.userData.id;
//       const defaultData = req.body;

//       // Check if settings already exist
//       const existingSettings = await Settings.findOne({ schoolId });
//       if (existingSettings) {
//         return res.status(400).json({
//           success: false,
//           message: "Settings already exist for this school",
//         });
//       }

//       const settings = await Settings.create({
//         schoolId,
//         ...defaultData,
//       });

//       res.status(201).json({
//         success: true,
//         data: settings,
//         message: "Settings created successfully",
//       });
//     } catch (error) {
//       res.status(500).json({
//         success: false,
//         message: error.message,
//       });
//     }
//   },

//   // Get settings
//   async getSettings(req, res) {
   
//     try {
//       const schoolId = req.user.userData.id || req.user._id;
//       const settings = await settingsService.getSettings(schoolId);

//       res.status(200).json({
//         success: true,
//         data: settings,
//       });
//     } catch (error) {
//       res.status(500).json({
//         success: false,
//         message: error.message,
//       });
//     }
//   },

//   // Update settings
//   async updateSettings(req, res) {
//     try {
//       const schoolId = req.user.userData.id;
//       const updateData = req.body;

//       const settings = await settingsService.updateSettings(
//         schoolId,
//         updateData,
//       );

//       res.status(200).json({
//         success: true,
//         data: settings,
//         message: "Settings updated successfully",
//       });
//     } catch (error) {
//       res.status(500).json({
//         success: false,
//         message: error.message,
//       });
//     }
//   },

//   // Update school info
//   async updateSchoolInfo(req, res) {
//     try {
//       const schoolId = req.user.userData.id;
//       const schoolInfoData = req.body;

//       const settings = await settingsService.updateSchoolInfo(
//         schoolId,
//         schoolInfoData,
//       );

//       res.status(200).json({
//         success: true,
//         data: settings,
//         message: "School info updated successfully",
//       });
//     } catch (error) {
//       res.status(500).json({
//         success: false,
//         message: error.message,
//       });
//     }
//   },

//   // Update preferences
//   async updatePreferences(req, res) {
//     try {
//       const schoolId = req.user.userData.id;
//       const preferencesData = req.body;

//       const settings = await settingsService.updatePreferences(
//         schoolId,
//         preferencesData,
//       );

//       res.status(200).json({
//         success: true,
//         data: settings,
//         message: "Preferences updated successfully",
//       });
//     } catch (error) {
//       res.status(500).json({
//         success: false,
//         message: error.message,
//       });
//     }
//   },

//   // Update security settings
//   async updateSecurity(req, res) {
//     try {
//       const schoolId = req.user.userData.id;
//       const securityData = req.body;

//       const settings = await settingsService.updateSecurity(
//         schoolId,
//         securityData,
//       );

//       res.status(200).json({
//         success: true,
//         data: settings,
//         message: "Security settings updated successfully",
//       });
//     } catch (error) {
//       res.status(500).json({
//         success: false,
//         message: error.message,
//       });
//     }
//   },

//   // Change password
//   async changePassword(req, res) {
//     try {
//       const userId = req.user.userData.id;
//       const { currentPassword, newPassword } = req.body;

//       const result = await settingsService.changePassword(
//         userId,
//         currentPassword,
//         newPassword,
//       );

//       res.status(200).json({
//         success: true,
//         message: result.message,
//       });
//     } catch (error) {
//       res.status(400).json({
//         success: false,
//         message: error.message,
//       });
//     }
//   },

//   // Toggle 3rd level
//   async toggle3rdLevel(req, res) {
//     try {
//       const schoolId = req.user.userData.id;
//       const { enabled } = req.body;

//       const settings = await settingsService.toggle3rdLevel(schoolId, enabled);

//       res.status(200).json({
//         success: true,
//         data: settings,
//         message: `3rd level ${enabled ? "enabled" : "disabled"} successfully`,
//       });
//     } catch (error) {
//       res.status(500).json({
//         success: false,
//         message: error.message,
//       });
//     }
//   },

//   // Update storage usage
//   async updateStorage(req, res) {
//     try {
//       const schoolId = req.user.userData.id;
//       const { fileSize } = req.body;

//       const settings = await settingsService.updateStorageUsage(
//         schoolId,
//         fileSize,
//       );

//       res.status(200).json({
//         success: true,
//         data: settings,
//         message: "Storage updated successfully",
//       });
//     } catch (error) {
//       res.status(500).json({
//         success: false,
//         message: error.message,
//       });
//     }
//   },
// };



// controllers/settingsController.js
import { Settings } from "../models/Settings.model.js";
import { settingsService } from "../services/settings.service.js";

export const settingsController = {
  // Create Settings
  async createSettings(req, res) {
    try {
      const schoolId = req.user.userData.id;
      const defaultData = req.body;

      const existingSettings = await Settings.findOne({ schoolId });
      if (existingSettings) {
        return res.status(400).json({
          success: false,
          message: "Settings already exist for this school",
        });
      }

      const settings = await Settings.create({
        schoolId,
        ...defaultData,
      });

      res.status(201).json({
        success: true,
        data: settings,
        message: "Settings created successfully",
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  },

  // Get Settings
  async getSettings(req, res) {
    try {
      const schoolId = req.params.schoolId || req.user.userData.id || req.user._id;
      const settings = await settingsService.getSettings(schoolId);

      res.status(200).json({
        success: true,
        data: settings,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  },

  // Update Settings (Full)
  async updateSettings(req, res) {
    try {
      const schoolId = req.user.userData.id;
      const updateData = req.body;

      const settings = await settingsService.updateSettings(
        schoolId,
        updateData,
      );

      res.status(200).json({
        success: true,
        data: settings,
        message: "Settings updated successfully",
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  },

  // Update School Info
  async updateSchoolInfo(req, res) {
    try {
      const schoolId = req.user.userData.id;
      const schoolInfoData = req.body;

      const settings = await settingsService.updateSchoolInfo(
        schoolId,
        schoolInfoData,
      );

      res.status(200).json({
        success: true,
        data: settings,
        message: "School info updated successfully",
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  },

  // Update Branding
  async updateBranding(req, res) {
    try {
      const schoolId = req.user.userData.id;
      const brandingData = req.body;

      const settings = await settingsService.updateBranding(
        schoolId,
        brandingData,
      );

      res.status(200).json({
        success: true,
        data: settings,
        message: "Branding updated successfully",
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  },

  // Update Profile
  async updateProfile(req, res) {
    try {
      const schoolId = req.user.userData.id;
      const profileData = req.body;

      const settings = await settingsService.updateProfile(
        schoolId,
        profileData,
      );

      res.status(200).json({
        success: true,
        data: settings,
        message: "Profile updated successfully",
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  },

  // Update Preferences
  async updatePreferences(req, res) {
    try {
      const schoolId = req.user.userData.id;
      const preferencesData = req.body;

      const settings = await settingsService.updatePreferences(
        schoolId,
        preferencesData,
      );

      res.status(200).json({
        success: true,
        data: settings,
        message: "Preferences updated successfully",
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  },

  // Update Security
  async updateSecurity(req, res) {
    try {
      const schoolId = req.user.userData.id;
      const securityData = req.body;

      const settings = await settingsService.updateSecurity(
        schoolId,
        securityData,
      );

      res.status(200).json({
        success: true,
        data: settings,
        message: "Security settings updated successfully",
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  },

  // Change Password
  async changePassword(req, res) {
    try {
      const userId = req.user.userData.id;
      const { currentPassword, newPassword } = req.body;

      const result = await settingsService.changePassword(
        userId,
        currentPassword,
        newPassword,
      );

      res.status(200).json({
        success: true,
        message: result.message,
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  },

  // Toggle 3rd Level
  async toggle3rdLevel(req, res) {
    try {
      const schoolId = req.user.userData.id;
      const { enabled } = req.body;

      const settings = await settingsService.toggle3rdLevel(schoolId, enabled);

      res.status(200).json({
        success: true,
        data: settings,
        message: `3rd level ${enabled ? "enabled" : "disabled"} successfully`,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  },

  // Update Storage
  async updateStorage(req, res) {
    try {
      const schoolId = req.user.userData.id;
      const { fileSize } = req.body;

      const settings = await settingsService.updateStorageUsage(
        schoolId,
        fileSize,
      );

      res.status(200).json({
        success: true,
        data: settings,
        message: "Storage updated successfully",
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  },
};