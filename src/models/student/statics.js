import mongoose from "mongoose";

export default function applyStatics(schema) {
  // Find students by class
  schema.statics.findByClass = function(classId, sectionId = null) {
    const query = { classId };
    if (sectionId) {
      query.sectionId = sectionId;
    }
    return this.find(query).populate("guardians.guardianId");
  };

  // Find students by guardian
  schema.statics.findByGuardian = function(guardianId) {
    return this.find({
      "guardians.guardianId": guardianId
    });
  };

  // Get class statistics
  schema.statics.getClassStats = async function(classId) {
    const stats = await this.aggregate([
      { $match: { classId: mongoose.Types.ObjectId(classId) } },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 }
        }
      }
    ]);

    const total = await this.countDocuments({ classId });
    
    return {
      total,
      byStatus: stats.reduce((acc, curr) => {
        acc[curr._id] = curr.count;
        return acc;
      }, {})
    };
  };

  // Get students with their primary guardians
  schema.statics.getWithPrimaryGuardian = function() {
    return this.aggregate([
      { $unwind: "$guardians" },
      { $match: { "guardians.isPrimary": true } },
      {
        $lookup: {
          from: "guardians",
          localField: "guardians.guardianId",
          foreignField: "_id",
          as: "primaryGuardian"
        }
      },
      {
        $group: {
          _id: "$_id",
          student: { $first: "$$ROOT" },
          primaryGuardian: { $first: "$primaryGuardian" }
        }
      }
    ]);
  };
}