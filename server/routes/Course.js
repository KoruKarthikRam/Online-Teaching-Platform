const express = require("express");
const router = express.Router();

// Course Controllers
const {
  createCourse,
  getAllCourses,
  getCourseDetails,
  getFullCourseDetails,
  editCourse,
  getInstructorCourses,
  deleteCourse,
} = require("../controllers/Course");

// Category Controllers
const {
  showAllCategories,
  createCategory,
  categoryPageDetails,
} = require("../controllers/Category");

// Section Controllers
const {
  createSection,
  updateSection,
  deleteSection,
} = require("../controllers/Section");

// SubSection Controllers
const {
  createSubSection,
  updateSubSection,
  deleteSubSection,
} = require("../controllers/Subsection");

// Rating Controllers
const {
  createRating,
  getAverageRating,
  getAllRating,
} = require("../controllers/RatingAndReview");

// Course Progress
const { updateCourseProgress } = require("../controllers/courseProgress");

// Middleware
const { auth, isInstructor, isStudent, isAdmin } =
  require("../middlewares/auth");

// ------------------- Course Routes -------------------
router.post("/createCourse", auth, isInstructor, createCourse);
router.post("/addSection", auth, isInstructor, createSection);
router.post("/updateSection", auth, isInstructor, updateSection);
router.post("/deleteSection", auth, isInstructor, deleteSection);

router.post("/addSubSection", auth, isInstructor, createSubSection);
router.post("/updateSubSection", auth, isInstructor, updateSubSection);
router.post("/deleteSubSection", auth, isInstructor, deleteSubSection);

router.get("/getAllCourses", getAllCourses);
router.post("/getCourseDetails", getCourseDetails);
router.post("/getFullCourseDetails", auth, getFullCourseDetails);

router.post("/editCourse", auth, isInstructor, editCourse);
router.get("/getInstructorCourses", auth, isInstructor, getInstructorCourses);
router.delete("/deleteCourse", auth, isInstructor, deleteCourse);

router.post("/updateCourseProgress", auth, isStudent, updateCourseProgress);

// ------------------- Category Routes -------------------
router.post("/createCategory", auth, isAdmin, createCategory);
router.get("/getAllCategories", showAllCategories);
router.post("/categoryPageDetails", categoryPageDetails);

// ------------------- Rating Routes -------------------
router.post("/createRating", auth, isStudent, createRating);
router.get("/getAverageRating/:courseId", getAverageRating);
router.get("/getAllRating/:courseId", getAllRating);

module.exports = router;
