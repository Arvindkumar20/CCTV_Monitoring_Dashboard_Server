// // services/settingsService.js
// import { Settings } from "../models/Settings.model.js";
// import { User } from "../models/user.model.js";
// import bcrypt from "bcryptjs";

// export const settingsService = {
//   // Get settings by school ID
//   async getSettings(schoolId) {
//     try {
//       const settings = await Settings.getOrCreate(schoolId);
//       return settings;
//     } catch (error) {
//       throw new Error(`Error fetching settings: ${error.message}`);
//     }
//   },

//   // Update settings
//   async updateSettings(schoolId, updateData) {
//     try {
//       const settings = await Settings.findOneAndUpdate(
//         { schoolId },
//         updateData,
//         { new: true, upsert: true }
//       );
//       return settings;
//     } catch (error) {
//       throw new Error(`Error updating settings: ${error.message}`);
//     }
//   },

//   // Update school info
//   async updateSchoolInfo(schoolId, schoolInfoData) {
//     try {
//       const settings = await Settings.findOneAndUpdate(
//         { schoolId },
//         { schoolInfo: schoolInfoData },
//         { new: true }
//       );
//       return settings;
//     } catch (error) {
//       throw new Error(`Error updating school info: ${error.message}`);
//     }
//   },

//   // Update preferences
//   async updatePreferences(schoolId, preferencesData) {
//     try {
//       const settings = await Settings.findOneAndUpdate(
//         { schoolId },
//         { preferences: preferencesData },
//         { new: true }
//       );
//       return settings;
//     } catch (error) {
//       throw new Error(`Error updating preferences: ${error.message}`);
//     }
//   },

//   // Update security settings
//   async updateSecurity(schoolId, securityData) {
//     try {
//       const settings = await Settings.findOneAndUpdate(
//         { schoolId },
//         { security: securityData },
//         { new: true }
//       );
//       return settings;
//     } catch (error) {
//       throw new Error(`Error updating security settings: ${error.message}`);
//     }
//   },

//   // Update storage usage
//   async updateStorageUsage(schoolId, fileSize) {
//     try {
//       const settings = await Settings.findOne({ schoolId });
//       if (!settings) {
//         throw new Error("Settings not found");
//       }
//       await settings.updateStorage(fileSize);
//       return settings;
//     } catch (error) {
//       throw new Error(`Error updating storage: ${error.message}`);
//     }
//   },

//   // Change password
//   async changePassword(userId, currentPassword, newPassword) {
//     try {
//       // Find user with password field
//       const user = await User.findById(userId).select('+password');
      
//       if (!user) {
//         throw new Error("User not found");
//       }

//       // Verify current password
//       const isPasswordValid = await bcrypt.compare(currentPassword, user.password);
//       if (!isPasswordValid) {
//         throw new Error("Current password is incorrect");
//       }

//       // Hash new password
//       const salt = await bcrypt.genSalt(10);
//       const hashedPassword = await bcrypt.hash(newPassword, salt);
      
//       // Update password
//       user.password = hashedPassword;
//       user.passwordChangedAt = new Date();
//       await user.save();

//       return { message: "Password updated successfully" };
//     } catch (error) {
//       throw new Error(`Error changing password: ${error.message}`);
//     }
//   },

//   // Toggle 3rd level
//   async toggle3rdLevel(schoolId, enabled) {
//     try {
//       const settings = await Settings.findOneAndUpdate(
//         { schoolId },
//         { 'preferences.enable3rdLevel': enabled },
//         { new: true }
//       );
//       return settings;
//     } catch (error) {
//       throw new Error(`Error toggling 3rd level: ${error.message}`);
//     }
//   }
// };



// services/settingsService.js
import { Settings } from "../models/Settings.model.js";
import { User } from "../models/user.model.js";
import bcrypt from "bcryptjs";

export const settingsService = {
  // Get settings
  async getSettings(schoolId) {
    try {
      const settings = await Settings.getOrCreate(schoolId);
      return settings;
    } catch (error) {
      throw new Error(`Error fetching settings: ${error.message}`);
    }
  },

  // Update settings (full)
  async updateSettings(schoolId, updateData) {
    try {
      const settings = await Settings.findOneAndUpdate(
        { schoolId },
        updateData,
        { new: true, upsert: true }
      );
      return settings;
    } catch (error) {
      throw new Error(`Error updating settings: ${error.message}`);
    }
  },

  // Update school info
  async updateSchoolInfo(schoolId, schoolInfoData) {
    try {
      const settings = await Settings.findOneAndUpdate(
        { schoolId },
        { schoolInfo: schoolInfoData },
        { new: true }
      );
      return settings;
    } catch (error) {
      throw new Error(`Error updating school info: ${error.message}`);
    }
  },

  // Update branding
  async updateBranding(schoolId, brandingData) {
    try {
      const settings = await Settings.findOneAndUpdate(
        { schoolId },
        { branding: brandingData },
        { new: true }
      );
      return settings;
    } catch (error) {
      throw new Error(`Error updating branding: ${error.message}`);
    }
  },

  // Update profile
  async updateProfile(schoolId, profileData) {
    try {
      const settings = await Settings.findOneAndUpdate(
        { schoolId },
        { profile: profileData },
        { new: true }
      );
      return settings;
    } catch (error) {
      throw new Error(`Error updating profile: ${error.message}`);
    }
  },

  // Update preferences
  async updatePreferences(schoolId, preferencesData) {
    try {
      const settings = await Settings.findOneAndUpdate(
        { schoolId },
        { preferences: preferencesData },
        { new: true }
      );
      return settings;
    } catch (error) {
      throw new Error(`Error updating preferences: ${error.message}`);
    }
  },

  // Update security
  async updateSecurity(schoolId, securityData) {
    try {
      const settings = await Settings.findOneAndUpdate(
        { schoolId },
        { security: securityData },
        { new: true }
      );
      return settings;
    } catch (error) {
      throw new Error(`Error updating security settings: ${error.message}`);
    }
  },

  // Update storage
  async updateStorageUsage(schoolId, fileSize) {
    try {
      const settings = await Settings.findOne({ schoolId });
      if (!settings) {
        throw new Error("Settings not found");
      }
      await settings.updateStorage(fileSize);
      return settings;
    } catch (error) {
      throw new Error(`Error updating storage: ${error.message}`);
    }
  },

  // Change password
  async changePassword(userId, currentPassword, newPassword) {
    try {
      const user = await User.findById(userId).select('+password');
      
      if (!user) {
        throw new Error("User not found");
      }

      const isPasswordValid = await bcrypt.compare(currentPassword, user.password);
      if (!isPasswordValid) {
        throw new Error("Current password is incorrect");
      }

      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(newPassword, salt);
      
      user.password = hashedPassword;
      user.passwordChangedAt = new Date();
      await user.save();

      return { message: "Password updated successfully" };
    } catch (error) {
      throw new Error(`Error changing password: ${error.message}`);
    }
  },

  // Toggle 3rd level
  async toggle3rdLevel(schoolId, enabled) {
    try {
      const settings = await Settings.findOneAndUpdate(
        { schoolId },
        { 'preferences.enable3rdLevel': enabled },
        { new: true }
      );
      return settings;
    } catch (error) {
      throw new Error(`Error toggling 3rd level: ${error.message}`);
    }
  }
};