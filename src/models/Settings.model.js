// // models/Settings.js
// import mongoose from "mongoose";

// const settingsSchema = new mongoose.Schema(
//   {
//     schoolId: {
//       type: mongoose.Schema.Types.ObjectId,
//       ref: "User",
//       required: true,
//       unique: true,
//       // index: true
//     },
//     schoolInfo: {
//       name: {
//         type: String,
//         required: true,
//       },
//       logo: String,
//       address: String,
//       phone: String,
//       email: String,
//       website: String,
//     },
//     preferences: {
//       enable3rdLevel: {
//         type: Boolean,
//         default: false,
//       },
//       theme: {
//         type: String,
//         enum: ["light", "dark", "system"],
//         default: "system",
//       },
//       language: {
//         type: String,
//         default: "en",
//       },
//       timezone: String,
//       academicYear: {
//         start: Date,
//         end: Date,
//       },
//     },
//     security: {
//       maxLoginAttempts: {
//         type: Number,
//         default: 5,
//       },
//       lockTime: {
//         type: Number,
//         default: 30,
//       },
//       passwordPolicy: {
//         minLength: { type: Number, default: 8 },
//         requireSpecialChar: { type: Boolean, default: true },
//         requireNumber: { type: Boolean, default: true },
//         requireUppercase: { type: Boolean, default: true },
//       },
//       twoFactorAuth: {
//         enabled: { type: Boolean, default: false },
//         methods: [String],
//       },
//     },
//     storage: {
//       total: {
//         type: Number,
//         default: 10737418240, // 10GB
//       },
//       used: {
//         type: Number,
//         default: 0,
//       },
//       files: {
//         count: { type: Number, default: 0 },
//         lastUpdated: Date,
//       },
//     },
//     features: {
//       onlineAdmission: { type: Boolean, default: false },
//       onlinePayment: { type: Boolean, default: false },
//       attendance: { type: Boolean, default: true },
//       examModule: { type: Boolean, default: true },
//     },
//   },
//   {
//     timestamps: true,
//   },
// );

// // Indexes
// // settingsSchema.index({ schoolId: 1 }, { unique: true });

// // Static method to get or create settings
// settingsSchema.statics.getOrCreate = async function (schoolId) {
//   let settings = await this.findOne({ schoolId });

//   if (!settings) {
//     settings = await this.create({
//       schoolId,
//       schoolInfo: { name: "School Name" }, // Default name
//     });
//   }

//   return settings;
// };

// // Method to update storage usage
// settingsSchema.methods.updateStorage = async function (fileSize) {
//   this.storage.used += fileSize;
//   this.storage.files.count += 1;
//   this.storage.files.lastUpdated = new Date();
//   return this.save();
// };

// export const Settings = mongoose.model("Settings", settingsSchema);


// models/Settings.js
import mongoose from "mongoose";

const settingsSchema = new mongoose.Schema(
  {
    schoolId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    schoolInfo: {
      name: { type: String, required: true },
      address: String,
      phone: String,
      email: String,
      website: String,
    },
    branding: {
      logo: String,
      favicon: String,
      primaryColor: { type: String, default: "#2563eb" },
      secondaryColor: { type: String, default: "#7c3aed" },
      accentColor: { type: String, default: "#06b6d4" },
    },
    profile: {
      fullName: String,
      email: String,
      phone: String,
      position: String,
      department: String,
      bio: String,
      avatar: String,
      joinDate: Date,
    },
    preferences: {
      enable3rdLevel: { type: Boolean, default: false },
      theme: { type: String, enum: ["light", "dark", "system"], default: "system" },
      language: { type: String, default: "en" },
      timezone: { type: String, default: "Asia/Kolkata" },
      passwordFormat: { type: String, default: "first3+ddmm" },
    },
    security: {
      maxLoginAttempts: { type: Number, default: 5 },
      lockTime: { type: Number, default: 30 },
      passwordPolicy: {
        minLength: { type: Number, default: 8 },
        requireSpecialChar: { type: Boolean, default: true },
        requireNumber: { type: Boolean, default: true },
        requireUppercase: { type: Boolean, default: true },
      },
      twoFactorAuth: {
        enabled: { type: Boolean, default: false },
        methods: [String],
      },
    },
    storage: {
      total: { type: Number, default: 10737418240 },
      used: { type: Number, default: 0 },
      files: {
        count: { type: Number, default: 0 },
        lastUpdated: Date,
      },
    },
    features: {
      onlineAdmission: { type: Boolean, default: false },
      onlinePayment: { type: Boolean, default: false },
      attendance: { type: Boolean, default: true },
      examModule: { type: Boolean, default: true },
    },
  },
  { timestamps: true }
);

// Static method to get or create settings
settingsSchema.statics.getOrCreate = async function (schoolId) {
  let settings = await this.findOne({ schoolId });

  if (!settings) {
    settings = await this.create({
      schoolId,
      schoolInfo: { name: " Name" },
      branding: {
        primaryColor: "#2563eb",
        secondaryColor: "#7c3aed",
        accentColor: "#06b6d4",
      },
      profile: {},
      preferences: {
        enable3rdLevel: false,
        theme: "system",
        language: "en",
        timezone: "Asia/Kolkata",
        passwordFormat: "first3+ddmm",
      },
      security: {
        maxLoginAttempts: 5,
        lockTime: 30,
        passwordPolicy: {
          minLength: 8,
          requireSpecialChar: true,
          requireNumber: true,
          requireUppercase: true,
        },
      },
      storage: {
        total: 10737418240,
        used: 0,
        files: { count: 0 },
      },
      features: {
        onlineAdmission: false,
        onlinePayment: false,
        attendance: true,
        examModule: true,
      },
    });
  }

  return settings;
};

// Method to update storage
settingsSchema.methods.updateStorage = async function (fileSize) {
  this.storage.used += fileSize;
  this.storage.files.count += 1;
  this.storage.files.lastUpdated = new Date();
  return this.save();
};

export const Settings = mongoose.model("Settings", settingsSchema);