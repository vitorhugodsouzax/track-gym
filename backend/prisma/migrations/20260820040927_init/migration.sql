-- CreateEnum
CREATE TYPE "EquipmentType" AS ENUM ('FREE_WEIGHT', 'MACHINE');

-- CreateEnum
CREATE TYPE "SetType" AS ENUM ('WARMUP', 'FEEDER', 'WORKING', 'TOP_SET', 'BACK_OFF', 'REST_PAUSE');

-- CreateEnum
CREATE TYPE "SessionStatus" AS ENUM ('IN_PROGRESS', 'COMPLETED');

-- CreateEnum
CREATE TYPE "Feeling" AS ENUM ('GOOD', 'NORMAL', 'BAD');

-- CreateTable
CREATE TABLE "WorkoutPlan" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WorkoutPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkoutDay" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "order" INTEGER NOT NULL,

    CONSTRAINT "WorkoutDay_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Exercise" (
    "id" TEXT NOT NULL,
    "workoutDayId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "equipmentType" "EquipmentType" NOT NULL,
    "videoUrl" TEXT,
    "increment" DECIMAL(10,2) NOT NULL DEFAULT 1,

    CONSTRAINT "Exercise_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExerciseSetTemplate" (
    "id" TEXT NOT NULL,
    "exerciseId" TEXT NOT NULL,
    "type" "SetType" NOT NULL,
    "order" INTEGER NOT NULL,
    "repRangeMin" INTEGER NOT NULL,
    "repRangeMax" INTEGER NOT NULL,
    "percentage" DECIMAL(5,2),

    CONSTRAINT "ExerciseSetTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkoutSession" (
    "id" TEXT NOT NULL,
    "workoutDayId" TEXT NOT NULL,
    "performedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" "SessionStatus" NOT NULL DEFAULT 'IN_PROGRESS',

    CONSTRAINT "WorkoutSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkoutExercise" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "exerciseTemplateId" TEXT,
    "nameSnapshot" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "equipmentType" "EquipmentType" NOT NULL,
    "workingWeight" DECIMAL(10,2),
    "increment" DECIMAL(10,2) NOT NULL,

    CONSTRAINT "WorkoutExercise_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkoutSet" (
    "id" TEXT NOT NULL,
    "workoutExerciseId" TEXT NOT NULL,
    "type" "SetType" NOT NULL,
    "order" INTEGER NOT NULL,
    "plannedWeight" DECIMAL(10,2),
    "actualWeight" DECIMAL(10,2),
    "repRangeMin" INTEGER NOT NULL,
    "repRangeMax" INTEGER NOT NULL,
    "completedReps" INTEGER,
    "loadControlled" BOOLEAN,
    "repsInReserve" INTEGER,
    "feeling" "Feeling",
    "repsClean" BOOLEAN,
    "notes" TEXT,

    CONSTRAINT "WorkoutSet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProgressionResult" (
    "id" TEXT NOT NULL,
    "workoutExerciseId" TEXT NOT NULL,
    "shouldProgress" BOOLEAN NOT NULL,
    "nextWorkingWeight" DECIMAL(10,2) NOT NULL,
    "percentage" DECIMAL(5,2),
    "reason" TEXT NOT NULL,

    CONSTRAINT "ProgressionResult_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "WorkoutDay_planId_order_key" ON "WorkoutDay"("planId", "order");

-- CreateIndex
CREATE UNIQUE INDEX "Exercise_workoutDayId_order_key" ON "Exercise"("workoutDayId", "order");

-- CreateIndex
CREATE UNIQUE INDEX "ExerciseSetTemplate_exerciseId_order_key" ON "ExerciseSetTemplate"("exerciseId", "order");

-- CreateIndex
CREATE UNIQUE INDEX "WorkoutExercise_sessionId_order_key" ON "WorkoutExercise"("sessionId", "order");

-- CreateIndex
CREATE UNIQUE INDEX "WorkoutSet_workoutExerciseId_order_key" ON "WorkoutSet"("workoutExerciseId", "order");

-- CreateIndex
CREATE UNIQUE INDEX "ProgressionResult_workoutExerciseId_key" ON "ProgressionResult"("workoutExerciseId");

-- AddForeignKey
ALTER TABLE "WorkoutDay" ADD CONSTRAINT "WorkoutDay_planId_fkey" FOREIGN KEY ("planId") REFERENCES "WorkoutPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Exercise" ADD CONSTRAINT "Exercise_workoutDayId_fkey" FOREIGN KEY ("workoutDayId") REFERENCES "WorkoutDay"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExerciseSetTemplate" ADD CONSTRAINT "ExerciseSetTemplate_exerciseId_fkey" FOREIGN KEY ("exerciseId") REFERENCES "Exercise"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkoutSession" ADD CONSTRAINT "WorkoutSession_workoutDayId_fkey" FOREIGN KEY ("workoutDayId") REFERENCES "WorkoutDay"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkoutExercise" ADD CONSTRAINT "WorkoutExercise_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "WorkoutSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkoutSet" ADD CONSTRAINT "WorkoutSet_workoutExerciseId_fkey" FOREIGN KEY ("workoutExerciseId") REFERENCES "WorkoutExercise"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProgressionResult" ADD CONSTRAINT "ProgressionResult_workoutExerciseId_fkey" FOREIGN KEY ("workoutExerciseId") REFERENCES "WorkoutExercise"("id") ON DELETE CASCADE ON UPDATE CASCADE;
