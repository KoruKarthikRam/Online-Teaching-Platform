const Course = require("../models/Course");
const Category = require("../models/Category");
const Section = require("../models/Section");
const SubSection = require("../models/SubSection");
const User = require("../models/User");
const { uploadImageToCloudinary } = require("../utils/imageUploader");
const CourseProgress = require("../models/CourseProgress");
const { convertSecondsToDuration } = require("../utils/secToDuration");

// Create a new course
exports.createCourse = async (req, res) => {
  try {
    const userId = req.user.id;
    let {
      courseName,
      courseDescription,
      whatYouWillLearn,
      price,
      tag: _tag,
      category,
      status,
      instructions: _instructions,
    } = req.body;

    const thumbnail = req.files?.thumbnailImage;
    const tag = _tag ? JSON.parse(_tag) : [];
    const instructions = _instructions ? JSON.parse(_instructions) : [];

    if (
      !courseName ||
      !courseDescription ||
      !whatYouWillLearn ||
      !price ||
      !tag.length ||
      !thumbnail ||
      !category ||
      !instructions.length
    ) {
      return res.status(400).json({ success: false, message: "All fields are mandatory" });
    }

    if (!status) status = "Draft";

    const instructorDetails = await User.findById(userId);
    if (!instructorDetails) {
      return res.status(404).json({ success: false, message: "Instructor details not found" });
    }

    const categoryDetails = await Category.findById(category);
    if (!categoryDetails) {
      return res.status(404).json({ success: false, message: "Category not found" });
    }

    const thumbnailImage = await uploadImageToCloudinary(thumbnail, process.env.FOLDER_NAME);

    const newCourse = await Course.create({
      courseName,
      courseDescription,
      instructor: instructorDetails._id,
      whatYouWillLearn,
      price,
      tag,
      category: categoryDetails._id,
      thumbnail: thumbnailImage.secure_url,
      status,
      instructions,
    });

    await User.findByIdAndUpdate(instructorDetails._id, { $push: { courses: newCourse._id } });
    await Category.findByIdAndUpdate(categoryDetails._id, { $push: { courses: newCourse._id } });

    res.status(200).json({ success: true, data: newCourse, message: "Course created successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Failed to create course", error: error.message });
  }
};

// Edit course
exports.editCourse = async (req, res) => {
  try {
    const { courseId } = req.body;
    const updates = req.body;
    const course = await Course.findById(courseId);
    if (!course) return res.status(404).json({ success: false, message: "Course not found" });

    if (req.files?.thumbnailImage) {
      const thumbnailImage = await uploadImageToCloudinary(req.files.thumbnailImage, process.env.FOLDER_NAME);
      course.thumbnail = thumbnailImage.secure_url;
    }

    for (const key in updates) {
      if (updates.hasOwnProperty(key)) {
        course[key] = key === "tag" || key === "instructions" ? JSON.parse(updates[key]) : updates[key];
      }
    }

    await course.save();
    const updatedCourse = await Course.findById(courseId)
      .populate("instructor")
      .populate("category")
      .populate("ratingAndReviews")
      .populate({ path: "courseContent", populate: { path: "subSection" } });

    res.json({ success: true, message: "Course updated successfully", data: updatedCourse });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Internal server error", error: error.message });
  }
};

// Get all published courses
exports.getAllCourses = async (req, res) => {
  try {
    const allCourses = await Course.find({ status: "Published" }, "courseName price thumbnail instructor ratingAndReviews studentsEnroled")
      .populate("instructor")
      .exec();

    res.status(200).json({ success: true, data: allCourses });
  } catch (error) {
    console.error(error);
    res.status(404).json({ success: false, message: "Cannot fetch courses", error: error.message });
  }
};

// Get course details
exports.getCourseDetails = async (req, res) => {
  try {
    const { courseId } = req.body;
    const courseDetails = await Course.findById(courseId)
      .populate({ path: "instructor", populate: { path: "additionalDetails" } })
      .populate("category")
      .populate("ratingAndReviews")
      .populate({ path: "courseContent", populate: { path: "subSection", select: "-videoUrl" } });

    if (!courseDetails) return res.status(400).json({ success: false, message: "Course not found" });

    let totalDurationInSeconds = 0;
    courseDetails.courseContent.forEach(content => {
      content.subSection.forEach(sub => totalDurationInSeconds += parseInt(sub.timeDuration || 0));
    });

    const totalDuration = convertSecondsToDuration(totalDurationInSeconds);

    res.status(200).json({ success: true, data: { courseDetails, totalDuration } });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get full course details with progress
exports.getFullCourseDetails = async (req, res) => {
  try {
    const { courseId } = req.body;
    const userId = req.user.id;

    const courseDetails = await Course.findById(courseId)
      .populate({ path: "instructor", populate: { path: "additionalDetails" } })
      .populate("category")
      .populate("ratingAndReviews")
      .populate({ path: "courseContent", populate: { path: "subSection" } });

    const courseProgress = await CourseProgress.findOne({ courseID: courseId, userId });

    let totalDurationInSeconds = 0;
    courseDetails.courseContent.forEach(content => {
      content.subSection.forEach(sub => totalDurationInSeconds += parseInt(sub.timeDuration || 0));
    });

    const totalDuration = convertSecondsToDuration(totalDurationInSeconds);

    res.status(200).json({
      success: true,
      data: {
        courseDetails,
        totalDuration,
        completedVideos: courseProgress?.completedVideos || [],
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get instructor courses
exports.getInstructorCourses = async (req, res) => {
  try {
    const instructorId = req.user.id;
    const instructorCourses = await Course.find({ instructor: instructorId }).sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: instructorCourses });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Failed to retrieve instructor courses", error: error.message });
  }
};

// Delete a course
exports.deleteCourse = async (req, res) => {
  try {
    const { courseId } = req.body;
    const course = await Course.findById(courseId);
    if (!course) return res.status(404).json({ success: false, message: "Course not found" });

    // Unenroll students
    for (const studentId of course.studentsEnroled) {
      await User.findByIdAndUpdate(studentId, { $pull: { courses: courseId } });
    }

    // Delete sections and sub-sections
    for (const sectionId of course.courseContent) {
      const section = await Section.findById(sectionId);
      if (section) {
        for (const subId of section.subSection) {
          await SubSection.findByIdAndDelete(subId);
        }
      }
      await Section.findByIdAndDelete(sectionId);
    }

    await Course.findByIdAndDelete(courseId);

    res.status(200).json({ success: true, message: "Course deleted successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};
