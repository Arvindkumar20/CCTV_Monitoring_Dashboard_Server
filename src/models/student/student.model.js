import mongoose from "mongoose";
import addressSchema from "../common/address.schema.js";

const studentSchema = new mongoose.Schema(
  {
    // Basic Information
    name: {
      type: String,
      required: [true, "Student name is required"],
      trim: true,
      minlength: [3, "Student name must be at least 3 characters"],
      maxlength: [100, "Student name cannot exceed 100 characters"],
      index: true,
    },
    dob: {
      type: Date,
      required: [true, "Date of birth is required"],
      validate: {
        validator: function (value) {
          const age = new Date().getFullYear() - value.getFullYear();
          return age >= 3 && age <= 20;
        },
        message: "Student age must be between 3 and 20 years",
      },
    },
    gender: {
      type: String,
      enum: ["male", "female", "other"],
      required: true,
    },
    
    // Academic Information
    classId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category", // Assuming Category is your class model
      required: [true, "Class is required"],
      index: true,
    },
    sectionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SubCategory",
      default: null,
    },
    groupId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "NestedSubCategory",
      default: null,
    },
    rollNumber: {
      type: String,
      unique: true,
      sparse: true,
    },
    admissionNumber: {
      type: String,
      unique: true,
      sparse: true,
    },
    admissionDate: {
      type: Date,
      default: Date.now,
    },

    // Contact Information
    mobile: {
      type: String,
      match: [
        /^(\+91|0)?[6-9]\d{9}$/,
        "Please enter a valid Indian mobile number",
      ],
    },
    email: {
      type: String,
      lowercase: true,
      trim: true,
      match: [
        /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
        "Please enter a valid email address",
      ],
    },
    
    // Address
    currentAddress: addressSchema,
    permanentAddress: addressSchema,

    // Student Photo
    photo: {
      type: String,
      default: null,
    },

    // Guardian References
    guardians: [{
      guardianId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Guardian",
        required: true,
      },
      relationship: {
        type: String,
      },
      isPrimary: {
        type: Boolean,
        default: false,
      },
    }],

    // Status
    status: {
      type: String,
      enum: ["active", "inactive", "transferred", "graduated", "suspended"],
      default: "active",
      index: true,
    },

    // Additional Information
    bloodGroup: {
      type: String,
      enum: ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"],
    },
    medicalConditions: String,
    allergies: String,
    emergencyContact: {
      name: String,
      relationship: String,
      phone: String,
    },

    // Metadata
    metaData: {
      type: Map,
      of: mongoose.Schema.Types.Mixed,
      default: {},
    },

    // Timestamps
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

export default studentSchema;