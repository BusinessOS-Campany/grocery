-- CreateTable
CREATE TABLE "ai_knowledge" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "type" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "source" TEXT,
    "approved" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ai_knowledge_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ai_knowledge_type_approved_idx" ON "ai_knowledge"("type", "approved");