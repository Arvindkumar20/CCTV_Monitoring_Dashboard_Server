import bcrypt from "bcryptjs";

export default function applyMethods(schema) {
  // Compare password
  schema.methods.comparePassword = async function (candidatePassword) {
    try {
      return await bcrypt.compare(candidatePassword, this.password);
    } catch (error) {
      return false;
    }
  };

  // Record login attempt
  schema.methods.recordLoginAttempt = async function (attemptData) {
    this.loginHistory.push(attemptData);

    if (attemptData.status === "success") {
      this.lastLoginAt = new Date();
      this.lastLoginIp = attemptData.ipAddress;
      this.lastLoginDevice = attemptData.deviceInfo;
      this.lastLoginUserAgent = attemptData.userAgent;
      this.loginAttempts = 0;
      this.accountLockedUntil = null;
    } else {
      this.loginAttempts += 1;

      if (this.loginAttempts >= 5) {
        this.status = "locked";
        this.accountLockedUntil = new Date(Date.now() + 30 * 60 * 1000);
      }
    }

    await this.save();
  };

  // Add student to guardian
  schema.methods.addStudent = async function(studentId, relationship, isPrimaryContact = false) {
    if (isPrimaryContact) {
      this.students = this.students.map(s => ({
        ...s,
        isPrimaryContact: false
      }));
    }

    this.students.push({
      studentId,
      relationship,
      isPrimaryContact
    });

    await this.save();
    return this;
  };

  // Remove student from guardian
  schema.methods.removeStudent = async function(studentId) {
    this.students = this.students.filter(
      s => s.studentId.toString() !== studentId.toString()
    );
    await this.save();
    return this;
  };

  // Check if guardian has student
  schema.methods.hasStudent = function(studentId) {
    return this.students?.some(
      s => s.studentId.toString() === studentId.toString()
    );
  };

  // Get all students with details
  schema.methods.getStudentsWithDetails = async function() {
    const Student = mongoose.model("Student");
    
    const studentIds = this.students.map(s => s.studentId);
    return Student.find({ _id: { $in: studentIds } })
      .populate("classId", "name")
      .populate("sectionId", "name")
      .populate("groupId", "name");
  };

  // Check if can login
  schema.methods.canLogin = function () {
    if (this.status === "locked" && this.accountLockedUntil) {
      if (this.accountLockedUntil < new Date()) {
        this.status = "active";
        this.loginAttempts = 0;
        this.accountLockedUntil = null;
        this.save();
        return { allowed: true };
      }
      return {
        allowed: false,
        reason: "Account locked until " + this.accountLockedUntil.toLocaleString(),
      };
    }

    if (this.status !== "active") {
      return { allowed: false, reason: `Account is ${this.status}` };
    }

    return { allowed: true };
  };

  // Generate password from guardian name and mobile number
  schema.methods.generatePassword = function (guardianName, mobile) {
    if (!guardianName || !mobile) return null;

    // Get first 3 letters of guardian name
    const first3 = guardianName.substring(0, 3).toLowerCase();
    
    // Get last 4 digits of mobile number
    const mobileStr = String(mobile).replace(/\D/g, ''); // Remove non-digits
    const last4Digits = mobileStr.slice(-4); // Get last 4 digits
    
    // Only generate if we have valid last 4 digits
    if (last4Digits.length !== 4) return null;
    
    return (
      first3.charAt(0).toUpperCase() +
      first3.slice(1) +
      last4Digits
    );
  };

  // Set password - checks if already hashed, if not then hashes it
  schema.methods.setPassword = async function(password) {
    // If password is already provided
    if (password) {
      // Check if password is already hashed (bcrypt hash starts with $2a$, $2b$, or $2y$)
      const isAlreadyHashed = password.startsWith('$2a$') || 
                              password.startsWith('$2b$') || 
                              password.startsWith('$2y$');
      
      if (!isAlreadyHashed) {
        // Hash the plain text password
        const salt = await bcrypt.genSalt(10);
        this.password = await bcrypt.hash(password, salt);
      } else {
        // Password is already hashed, use as is
        this.password = password;
      }
    }
    
    return this;
  };

  // Generate and set password - main method to use
  schema.methods.generateAndSetPassword = async function(guardianName, mobile, providedPassword = null) {
    // If password is provided, use it
    if (providedPassword) {
      await this.setPassword(providedPassword);
      return providedPassword;
    }
    
    // Generate password from guardian name and mobile
    const generatedPassword = this.generatePassword(guardianName, mobile);
    
    if (generatedPassword) {
      await this.setPassword(generatedPassword);
      return generatedPassword;
    }
    
    return null;
  };

  // Keep the old method for backward compatibility if needed
  schema.methods.generatePasswordFromStudent = function (studentName, dob) {
    if (!studentName || !dob) return null;

    const first3 = studentName.substring(0, 3);
    const dateObj = new Date(dob);
    const day = String(dateObj.getDate()).padStart(2, "0");
    const month = String(dateObj.getMonth() + 1).padStart(2, "0");

    return (
      first3.charAt(0).toUpperCase() + 
      first3.slice(1).toLowerCase() + 
      day + 
      month
    );
  };

  // Set password from student (backward compatibility)
  schema.methods.setPasswordFromStudent = async function(studentName, dob, providedPassword = null) {
    if (providedPassword) {
      await this.setPassword(providedPassword);
      return providedPassword;
    }
    
    const generatedPassword = this.generatePasswordFromStudent(studentName, dob);
    
    if (generatedPassword) {
      await this.setPassword(generatedPassword);
      return generatedPassword;
    }
    
    return null;
  };
}