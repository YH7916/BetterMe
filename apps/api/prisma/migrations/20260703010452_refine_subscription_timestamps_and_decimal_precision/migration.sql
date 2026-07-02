-- AlterTable: tighten decimal precision on assessment_results.bmi
ALTER TABLE "assessment_results" ALTER COLUMN "bmi" TYPE DECIMAL(8,4);

-- AlterTable: tighten decimal precision on assessments
ALTER TABLE "assessments" ALTER COLUMN "height_cm" TYPE DECIMAL(6,2);
ALTER TABLE "assessments" ALTER COLUMN "weight_kg" TYPE DECIMAL(6,2);
ALTER TABLE "assessments" ALTER COLUMN "target_weight_kg" TYPE DECIMAL(6,2);

-- AlterTable: add timestamps to subscriptions
ALTER TABLE "subscriptions" ADD COLUMN "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "subscriptions" ADD COLUMN "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
