-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('male', 'female');

-- CreateEnum
CREATE TYPE "Goal" AS ENUM ('lose_weight', 'gain_muscle', 'maintain');

-- CreateEnum
CREATE TYPE "WorkoutFrequency" AS ENUM ('sedentary', 'light', 'moderate', 'active');

-- CreateEnum
CREATE TYPE "BmiCategory" AS ENUM ('underweight', 'normal', 'overweight', 'obese');

-- CreateEnum
CREATE TYPE "AssessmentStatus" AS ENUM ('in_progress', 'completed');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('inactive', 'active');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assessments" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "gender" "Gender",
    "primary_goal" "Goal",
    "age" INTEGER,
    "height_cm" DECIMAL(65,30),
    "weight_kg" DECIMAL(65,30),
    "target_weight_kg" DECIMAL(65,30),
    "workout_frequency" "WorkoutFrequency",
    "current_step" INTEGER NOT NULL DEFAULT 0,
    "status" "AssessmentStatus" NOT NULL DEFAULT 'in_progress',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "assessments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assessment_results" (
    "id" TEXT NOT NULL,
    "assessment_id" TEXT NOT NULL,
    "bmi" DECIMAL(65,30) NOT NULL,
    "bmi_category" "BmiCategory" NOT NULL,
    "daily_calorie_intake" INTEGER NOT NULL,
    "target_date" DATE NOT NULL,
    "algorithm_version" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "assessment_results_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscriptions" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'inactive',
    "plan" TEXT,
    "activated_at" TIMESTAMP(3),
    "payment_ref" TEXT,

    CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "assessments_user_id_idx" ON "assessments"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "assessment_results_assessment_id_key" ON "assessment_results"("assessment_id");

-- CreateIndex
CREATE UNIQUE INDEX "subscriptions_user_id_key" ON "subscriptions"("user_id");

-- AddForeignKey
ALTER TABLE "assessments" ADD CONSTRAINT "assessments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assessment_results" ADD CONSTRAINT "assessment_results_assessment_id_fkey" FOREIGN KEY ("assessment_id") REFERENCES "assessments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
