-- AlterTable
ALTER TABLE "itinerary_days" ADD COLUMN     "distance_km" DECIMAL(5,1),
ADD COLUMN     "elevation_gain" INTEGER,
ADD COLUMN     "end_location" TEXT,
ADD COLUMN     "start_location" TEXT;

-- CreateTable
CREATE TABLE "portal_update_acknowledgements" (
    "id" TEXT NOT NULL,
    "workspace_id" TEXT NOT NULL,
    "trip_id" TEXT NOT NULL,
    "traveler_id" TEXT NOT NULL,
    "update_id" TEXT NOT NULL,
    "acknowledged_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "portal_update_acknowledgements_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "portal_update_acknowledgements_workspace_id_trip_id_idx" ON "portal_update_acknowledgements"("workspace_id", "trip_id");

-- CreateIndex
CREATE INDEX "portal_update_acknowledgements_update_id_idx" ON "portal_update_acknowledgements"("update_id");

-- CreateIndex
CREATE UNIQUE INDEX "portal_update_acknowledgements_traveler_id_update_id_key" ON "portal_update_acknowledgements"("traveler_id", "update_id");

-- AddForeignKey
ALTER TABLE "portal_update_acknowledgements" ADD CONSTRAINT "portal_update_acknowledgements_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "portal_update_acknowledgements" ADD CONSTRAINT "portal_update_acknowledgements_trip_id_fkey" FOREIGN KEY ("trip_id") REFERENCES "trips"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "portal_update_acknowledgements" ADD CONSTRAINT "portal_update_acknowledgements_traveler_id_fkey" FOREIGN KEY ("traveler_id") REFERENCES "trip_travelers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "portal_update_acknowledgements" ADD CONSTRAINT "portal_update_acknowledgements_update_id_fkey" FOREIGN KEY ("update_id") REFERENCES "field_reports"("id") ON DELETE CASCADE ON UPDATE CASCADE;

