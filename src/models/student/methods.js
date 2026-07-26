export default function applyMethods(schema) {
  // Add guardian to student
  schema.methods.addGuardian = async function(guardianId, relationship, isPrimary = false) {
    if (isPrimary) {
      // Remove primary flag from other guardians
      this.guardians = this.guardians.map(g => ({
        ...g,
        isPrimary: false
      }));
    }

    this.guardians.push({
      guardianId,
      relationship,
      isPrimary
    });

    await this.save();
    return this;
  };

  // Remove guardian from student
  schema.methods.removeGuardian = async function(guardianId) {
    this.guardians = this.guardians.filter(
      g => g.guardianId.toString() !== guardianId.toString()
    );
    await this.save();
    return this;
  };

  // Set primary guardian
  schema.methods.setPrimaryGuardian = async function(guardianId) {
    this.guardians = this.guardians.map(g => ({
      ...g,
      isPrimary: g.guardianId.toString() === guardianId.toString()
    }));
    await this.save();
    return this;
  };

  // Check if student has guardian
  schema.methods.hasGuardian = function(guardianId) {
    return this.guardians?.some(
      g => g.guardianId.toString() === guardianId.toString()
    );
  };

  // Get full academic info
  schema.methods.getAcademicInfo = async function() {
    const Category = mongoose.model("Category");
    const SubCategory = mongoose.model("SubCategory");
    const NestedSubCategory = mongoose.model("NestedSubCategory");

    const [classInfo, sectionInfo, groupInfo] = await Promise.all([
      Category.findById(this.classId).select("name"),
      this.sectionId ? SubCategory.findById(this.sectionId).select("name") : null,
      this.groupId ? NestedSubCategory.findById(this.groupId).select("name") : null
    ]);

    return {
      class: classInfo,
      section: sectionInfo,
      group: groupInfo,
      rollNumber: this.rollNumber,
      admissionNumber: this.admissionNumber,
      admissionDate: this.admissionDate
    };
  };
}