const { instance } = require("../config/razorpay")
const Course = require("../models/Course")
const crypto = require("crypto")
const User = require("../models/User")
const mailSender = require("../utils/mailSender")
const mongoose = require("mongoose")
const {
  courseEnrollmentEmail,
} = require("../mail/templates/courseEnrollmentEmail")
const {
  paymentSuccessEmail,
} = require("../mail/templates/paymentSuccessEmail")
const CourseProgress = require("../models/CourseProgress")

// ================= CAPTURE PAYMENT =================
exports.capturePayment = async (req, res) => {
  const { courses } = req.body
  const userId = req.user.id

  if (!courses || courses.length === 0) {
    return res.json({ success: false, message: "Please Provide Course ID" })
  }

  let total_amount = 0

  for (const course_id of courses) {
    const course = await Course.findById(course_id)
    if (!course) {
      return res.status(404).json({ success: false, message: "Course not found" })
    }

    const uid = new mongoose.Types.ObjectId(userId)
    if (course.studentsEnroled.includes(uid)) {
      return res
        .status(400)
        .json({ success: false, message: "Already enrolled" })
    }

    total_amount += course.price
  }

  // 🔹 MOCK MODE (NO RAZORPAY KEYS)
  if (!instance) {
    return res.status(200).json({
      success: true,
      message: "Mock payment order created",
      data: {
        id: "order_mock_" + Date.now(),
        amount: total_amount * 100,
        currency: "INR",
      },
    })
  }

  // 🔹 REAL RAZORPAY MODE
  try {
    const options = {
      amount: total_amount * 100,
      currency: "INR",
      receipt: `receipt_${Date.now()}`,
    }

    const paymentResponse = await instance.orders.create(options)

    return res.status(200).json({
      success: true,
      data: paymentResponse,
    })
  } catch (error) {
    console.error(error)
    return res
      .status(500)
      .json({ success: false, message: "Payment initiation failed" })
  }
}

// ================= VERIFY PAYMENT =================
exports.verifyPayment = async (req, res) => {
  const {
    razorpay_order_id,
    razorpay_payment_id,
    razorpay_signature,
    courses,
  } = req.body
  const userId = req.user.id

  // 🔹 MOCK VERIFY
  if (!instance) {
    await enrollStudents(courses, userId, res)
    return res.status(200).json({
      success: true,
      message: "Mock payment verified",
    })
  }

  const body = razorpay_order_id + "|" + razorpay_payment_id

  const expectedSignature = crypto
    .createHmac("sha256", process.env.RAZORPAY_SECRET)
    .update(body)
    .digest("hex")

  if (expectedSignature === razorpay_signature) {
    await enrollStudents(courses, userId, res)
    return res.status(200).json({ success: true, message: "Payment Verified" })
  }

  return res.status(400).json({ success: false, message: "Payment Failed" })
}

// ================= PAYMENT EMAIL =================
exports.sendPaymentSuccessEmail = async (req, res) => {
  const { orderId, paymentId, amount } = req.body
  const userId = req.user.id

  try {
    const student = await User.findById(userId)

    await mailSender(
      student.email,
      "Payment Received",
      paymentSuccessEmail(
        `${student.firstName} ${student.lastName}`,
        amount / 100,
        orderId,
        paymentId
      )
    )

    return res.status(200).json({
      success: true,
      message: "Payment email sent",
    })
  } catch (error) {
    console.error(error)
    return res.status(500).json({
      success: false,
      message: "Email sending failed",
    })
  }
}

// ================= ENROLL STUDENTS =================
const enrollStudents = async (courses, userId, res) => {
  for (const courseId of courses) {
    const enrolledCourse = await Course.findByIdAndUpdate(
      courseId,
      { $push: { studentsEnroled: userId } },
      { new: true }
    )

    const courseProgress = await CourseProgress.create({
      courseID: courseId,
      userId,
      completedVideos: [],
    })

    const student = await User.findByIdAndUpdate(
      userId,
      {
        $push: {
          courses: courseId,
          courseProgress: courseProgress._id,
        },
      },
      { new: true }
    )

    await mailSender(
      student.email,
      `Enrolled in ${enrolledCourse.courseName}`,
      courseEnrollmentEmail(
        enrolledCourse.courseName,
        `${student.firstName} ${student.lastName}`
      )
    )
  }
}
