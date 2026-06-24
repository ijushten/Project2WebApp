import mongoose from "mongoose";

const lessonPlanSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    title: {
      type: String,
      required: true,
      trim: true
    },
    subject: {
      type: String,
      required: true,
      trim: true
    },
    topic: {
      type: String,
      required: true,
      trim: true
    },
    gradeLevel: {
      type: String,
      required: true,
      trim: true
    },
    lessonLength: {
      type: String,
      required: true,
      trim: true
    },
    learningGoal: {
      type: String,
      required: true,
      trim: true
    },
    lessonStyle: {
      type: String,
      required: true,
      trim: true
    },
    planText: {
      type: String,
      required: true
    },
    notes: {
      type: String,
      default: ""
    }
  },
  { timestamps: true }
);

export default mongoose.model("LessonPlan", lessonPlanSchema);
