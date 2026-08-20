-- CreateIndex
CREATE INDEX "WorkoutSession_userId_status_performedAt_idx" ON "WorkoutSession"("userId", "status", "performedAt");

-- CreateIndex
CREATE INDEX "WorkoutSession_workoutDayId_idx" ON "WorkoutSession"("workoutDayId");

-- CreateIndex
CREATE INDEX "WorkoutExercise_exerciseTemplateId_idx" ON "WorkoutExercise"("exerciseTemplateId");
