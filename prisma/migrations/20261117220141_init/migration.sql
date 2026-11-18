-- CreateEnum
CREATE TYPE "Role" AS ENUM ('USER', 'ADMIN');

-- CreateEnum
CREATE TYPE "ProjectStatus" AS ENUM ('DRAFT', 'ANALYZING', 'CONCEPTING', 'STORYBOARDING', 'GENERATING', 'ASSEMBLING', 'RENDERING', 'COMPLETE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "AssetKind" AS ENUM ('IMAGE', 'VIDEO', 'AUDIO', 'FONT', 'OTHER');

-- CreateEnum
CREATE TYPE "AnalysisStatus" AS ENUM ('PENDING', 'RUNNING', 'COMPLETE', 'FAILED');

-- CreateEnum
CREATE TYPE "SceneStatus" AS ENUM ('DRAFT', 'PENDING_REVIEW', 'APPROVED', 'REJECTED', 'GENERATING', 'GENERATED', 'FAILED');

-- CreateEnum
CREATE TYPE "GenerationStatus" AS ENUM ('QUEUED', 'RUNNING', 'SUCCEEDED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "LyricsSource" AS ENUM ('MANUAL', 'TRANSCRIBED', 'UPLOADED');

-- CreateEnum
CREATE TYPE "LyricsStatus" AS ENUM ('DRAFT', 'REVIEWED', 'FINAL');

-- CreateEnum
CREATE TYPE "RenderKind" AS ENUM ('PREVIEW', 'FINAL', 'LYRIC_VIDEO', 'PROMO_CLIP');

-- CreateEnum
CREATE TYPE "RenderStatus" AS ENUM ('QUEUED', 'RUNNING', 'SUCCEEDED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PromoPlatform" AS ENUM ('TIKTOK', 'INSTAGRAM_REELS', 'YOUTUBE_SHORTS');

-- CreateEnum
CREATE TYPE "ProviderKind" AS ENUM ('VIDEO', 'IMAGE', 'LLM', 'TRANSCRIPTION');

-- CreateEnum
CREATE TYPE "JobType" AS ENUM ('SONG_ANALYSIS', 'SCENE_GENERATION', 'RENDER_ASSEMBLY', 'PROMO_CLIP', 'TRANSCRIPTION');

-- CreateEnum
CREATE TYPE "JobStatus" AS ENUM ('QUEUED', 'RUNNING', 'SUCCEEDED', 'FAILED', 'CANCELLED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT,
    "role" "Role" NOT NULL DEFAULT 'USER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Project" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" "ProjectStatus" NOT NULL DEFAULT 'DRAFT',
    "audioUploadId" TEXT,
    "analysisId" TEXT,
    "storyboardId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AudioUpload" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "durationSec" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AudioUpload_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ArtistReference" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "projectId" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "faceNotes" TEXT,
    "hairNotes" TEXT,
    "wardrobeNotes" TEXT,
    "physiqueNotes" TEXT,
    "otherNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ArtistReference_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CharacterReference" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CharacterReference_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReferenceImage" (
    "id" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "artistRefId" TEXT,
    "characterRefId" TEXT,

    CONSTRAINT "ReferenceImage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectAsset" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "kind" "AssetKind" NOT NULL,
    "filename" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "meta" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProjectAsset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SongAnalysis" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "audioId" TEXT NOT NULL,
    "bpm" DOUBLE PRECISION,
    "bpmConfidence" DOUBLE PRECISION,
    "key" TEXT,
    "mode" TEXT,
    "durationSec" DOUBLE PRECISION NOT NULL,
    "energyCurve" JSONB,
    "beatGrid" JSONB,
    "status" "AnalysisStatus" NOT NULL DEFAULT 'PENDING',
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SongAnalysis_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SongSection" (
    "id" TEXT NOT NULL,
    "analysisId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "label" TEXT NOT NULL,
    "startSec" DOUBLE PRECISION NOT NULL,
    "endSec" DOUBLE PRECISION NOT NULL,
    "energy" DOUBLE PRECISION,
    "notes" TEXT,

    CONSTRAINT "SongSection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CreativeTreatment" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "logline" TEXT,
    "mood" TEXT,
    "visualStyle" TEXT,
    "palette" TEXT,
    "directorNotes" JSONB,
    "locations" JSONB,
    "characters" JSONB,
    "wardrobe" JSONB,
    "vehicles" JSONB,
    "props" JSONB,
    "cameraStyle" JSONB,
    "lighting" JSONB,
    "transitions" JSONB,
    "userInstructions" TEXT,
    "selected" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CreativeTreatment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Storyboard" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "treatmentId" TEXT,
    "title" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Storyboard_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StoryboardScene" (
    "id" TEXT NOT NULL,
    "storyboardId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "number" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "sectionLabel" TEXT,
    "lyricText" TEXT,
    "startSec" DOUBLE PRECISION NOT NULL,
    "durationSec" DOUBLE PRECISION NOT NULL,
    "location" TEXT,
    "cameraAngle" TEXT,
    "cameraMove" TEXT,
    "lighting" TEXT,
    "transition" TEXT,
    "status" "SceneStatus" NOT NULL DEFAULT 'DRAFT',
    "locked" BOOLEAN NOT NULL DEFAULT false,
    "approvedAt" TIMESTAMP(3),
    "currentVersionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StoryboardScene_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StoryboardSceneRef" (
    "id" TEXT NOT NULL,
    "sceneId" TEXT NOT NULL,
    "artistRefId" TEXT,
    "characterRefId" TEXT,

    CONSTRAINT "StoryboardSceneRef_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SceneVersion" (
    "id" TEXT NOT NULL,
    "sceneId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "description" TEXT NOT NULL,
    "prompt" TEXT,
    "changedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SceneVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SceneGeneration" (
    "id" TEXT NOT NULL,
    "sceneId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "model" TEXT,
    "status" "GenerationStatus" NOT NULL DEFAULT 'QUEUED',
    "progress" INTEGER NOT NULL DEFAULT 0,
    "prompt" TEXT,
    "negativePrompt" TEXT,
    "seed" INTEGER,
    "storageKey" TEXT,
    "posterKey" TEXT,
    "error" TEXT,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "jobId" TEXT,
    "costCredits" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "startedAt" TIMESTAMP(3),
    "finishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SceneGeneration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Lyrics" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "audioId" TEXT,
    "source" "LyricsSource" NOT NULL DEFAULT 'MANUAL',
    "language" TEXT NOT NULL DEFAULT 'en',
    "status" "LyricsStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Lyrics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LyricLine" (
    "id" TEXT NOT NULL,
    "lyricsId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "text" TEXT NOT NULL,
    "startSec" DOUBLE PRECISION NOT NULL,
    "endSec" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "LyricLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WordTimestamp" (
    "id" TEXT NOT NULL,
    "lineId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "word" TEXT NOT NULL,
    "startSec" DOUBLE PRECISION NOT NULL,
    "endSec" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "WordTimestamp_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RenderJob" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "kind" "RenderKind" NOT NULL,
    "preset" TEXT,
    "status" "RenderStatus" NOT NULL DEFAULT 'QUEUED',
    "progress" INTEGER NOT NULL DEFAULT 0,
    "sceneIds" JSONB,
    "options" JSONB,
    "outputKey" TEXT,
    "posterKey" TEXT,
    "durationSec" DOUBLE PRECISION,
    "sizeBytes" INTEGER,
    "error" TEXT,
    "startedAt" TIMESTAMP(3),
    "finishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RenderJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RenderOutput" (
    "id" TEXT NOT NULL,
    "renderJobId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RenderOutput_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PromoClip" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "platform" "PromoPlatform" NOT NULL,
    "durationSec" DOUBLE PRECISION NOT NULL,
    "startSec" DOUBLE PRECISION NOT NULL,
    "endSec" DOUBLE PRECISION NOT NULL,
    "title" TEXT,
    "status" "RenderStatus" NOT NULL DEFAULT 'QUEUED',
    "renderJobId" TEXT,
    "outputKey" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PromoClip_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiProvider" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "kind" "ProviderKind" NOT NULL,
    "name" TEXT NOT NULL,
    "baseUrl" TEXT,
    "model" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "config" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AiProvider_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UsageRecord" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "operation" TEXT NOT NULL,
    "credits" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "meta" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UsageRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Job" (
    "id" TEXT NOT NULL,
    "projectId" TEXT,
    "type" "JobType" NOT NULL,
    "payload" JSONB NOT NULL,
    "status" "JobStatus" NOT NULL DEFAULT 'QUEUED',
    "priority" INTEGER NOT NULL DEFAULT 0,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 3,
    "progress" INTEGER NOT NULL DEFAULT 0,
    "progressMessage" TEXT,
    "result" JSONB,
    "error" TEXT,
    "runAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startedAt" TIMESTAMP(3),
    "finishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Job_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Session_token_key" ON "Session"("token");

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "Session"("userId");

-- CreateIndex
CREATE INDEX "Project_userId_idx" ON "Project"("userId");

-- CreateIndex
CREATE INDEX "AudioUpload_projectId_idx" ON "AudioUpload"("projectId");

-- CreateIndex
CREATE INDEX "ArtistReference_userId_idx" ON "ArtistReference"("userId");

-- CreateIndex
CREATE INDEX "ArtistReference_projectId_idx" ON "ArtistReference"("projectId");

-- CreateIndex
CREATE INDEX "CharacterReference_projectId_idx" ON "CharacterReference"("projectId");

-- CreateIndex
CREATE INDEX "ReferenceImage_artistRefId_idx" ON "ReferenceImage"("artistRefId");

-- CreateIndex
CREATE INDEX "ReferenceImage_characterRefId_idx" ON "ReferenceImage"("characterRefId");

-- CreateIndex
CREATE INDEX "ProjectAsset_projectId_idx" ON "ProjectAsset"("projectId");

-- CreateIndex
CREATE INDEX "SongAnalysis_projectId_idx" ON "SongAnalysis"("projectId");

-- CreateIndex
CREATE INDEX "SongSection_analysisId_idx" ON "SongSection"("analysisId");

-- CreateIndex
CREATE INDEX "CreativeTreatment_projectId_idx" ON "CreativeTreatment"("projectId");

-- CreateIndex
CREATE INDEX "Storyboard_projectId_idx" ON "Storyboard"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "StoryboardScene_currentVersionId_key" ON "StoryboardScene"("currentVersionId");

-- CreateIndex
CREATE INDEX "StoryboardScene_storyboardId_idx" ON "StoryboardScene"("storyboardId");

-- CreateIndex
CREATE INDEX "StoryboardSceneRef_sceneId_idx" ON "StoryboardSceneRef"("sceneId");

-- CreateIndex
CREATE INDEX "SceneVersion_sceneId_idx" ON "SceneVersion"("sceneId");

-- CreateIndex
CREATE INDEX "SceneGeneration_sceneId_idx" ON "SceneGeneration"("sceneId");

-- CreateIndex
CREATE UNIQUE INDEX "Lyrics_projectId_key" ON "Lyrics"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "Lyrics_audioId_key" ON "Lyrics"("audioId");

-- CreateIndex
CREATE INDEX "Lyrics_projectId_idx" ON "Lyrics"("projectId");

-- CreateIndex
CREATE INDEX "LyricLine_lyricsId_idx" ON "LyricLine"("lyricsId");

-- CreateIndex
CREATE INDEX "WordTimestamp_lineId_idx" ON "WordTimestamp"("lineId");

-- CreateIndex
CREATE INDEX "RenderJob_projectId_idx" ON "RenderJob"("projectId");

-- CreateIndex
CREATE INDEX "RenderOutput_renderJobId_idx" ON "RenderOutput"("renderJobId");

-- CreateIndex
CREATE INDEX "PromoClip_projectId_idx" ON "PromoClip"("projectId");

-- CreateIndex
CREATE INDEX "AiProvider_userId_idx" ON "AiProvider"("userId");

-- CreateIndex
CREATE INDEX "UsageRecord_userId_idx" ON "UsageRecord"("userId");

-- CreateIndex
CREATE INDEX "Job_status_runAt_priority_idx" ON "Job"("status", "runAt", "priority");

-- CreateIndex
CREATE INDEX "Job_projectId_idx" ON "Job"("projectId");

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AudioUpload" ADD CONSTRAINT "AudioUpload_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArtistReference" ADD CONSTRAINT "ArtistReference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArtistReference" ADD CONSTRAINT "ArtistReference_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CharacterReference" ADD CONSTRAINT "CharacterReference_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReferenceImage" ADD CONSTRAINT "ReferenceImage_artistRefId_fkey" FOREIGN KEY ("artistRefId") REFERENCES "ArtistReference"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReferenceImage" ADD CONSTRAINT "ReferenceImage_characterRefId_fkey" FOREIGN KEY ("characterRefId") REFERENCES "CharacterReference"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectAsset" ADD CONSTRAINT "ProjectAsset_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SongAnalysis" ADD CONSTRAINT "SongAnalysis_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SongAnalysis" ADD CONSTRAINT "SongAnalysis_audioId_fkey" FOREIGN KEY ("audioId") REFERENCES "AudioUpload"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SongSection" ADD CONSTRAINT "SongSection_analysisId_fkey" FOREIGN KEY ("analysisId") REFERENCES "SongAnalysis"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreativeTreatment" ADD CONSTRAINT "CreativeTreatment_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Storyboard" ADD CONSTRAINT "Storyboard_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Storyboard" ADD CONSTRAINT "Storyboard_treatmentId_fkey" FOREIGN KEY ("treatmentId") REFERENCES "CreativeTreatment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StoryboardScene" ADD CONSTRAINT "StoryboardScene_storyboardId_fkey" FOREIGN KEY ("storyboardId") REFERENCES "Storyboard"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StoryboardScene" ADD CONSTRAINT "StoryboardScene_currentVersionId_fkey" FOREIGN KEY ("currentVersionId") REFERENCES "SceneVersion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StoryboardSceneRef" ADD CONSTRAINT "StoryboardSceneRef_sceneId_fkey" FOREIGN KEY ("sceneId") REFERENCES "StoryboardScene"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StoryboardSceneRef" ADD CONSTRAINT "StoryboardSceneRef_artistRefId_fkey" FOREIGN KEY ("artistRefId") REFERENCES "ArtistReference"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StoryboardSceneRef" ADD CONSTRAINT "StoryboardSceneRef_characterRefId_fkey" FOREIGN KEY ("characterRefId") REFERENCES "CharacterReference"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SceneVersion" ADD CONSTRAINT "SceneVersion_sceneId_fkey" FOREIGN KEY ("sceneId") REFERENCES "StoryboardScene"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SceneGeneration" ADD CONSTRAINT "SceneGeneration_sceneId_fkey" FOREIGN KEY ("sceneId") REFERENCES "StoryboardScene"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lyrics" ADD CONSTRAINT "Lyrics_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lyrics" ADD CONSTRAINT "Lyrics_audioId_fkey" FOREIGN KEY ("audioId") REFERENCES "AudioUpload"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LyricLine" ADD CONSTRAINT "LyricLine_lyricsId_fkey" FOREIGN KEY ("lyricsId") REFERENCES "Lyrics"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WordTimestamp" ADD CONSTRAINT "WordTimestamp_lineId_fkey" FOREIGN KEY ("lineId") REFERENCES "LyricLine"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RenderJob" ADD CONSTRAINT "RenderJob_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RenderOutput" ADD CONSTRAINT "RenderOutput_renderJobId_fkey" FOREIGN KEY ("renderJobId") REFERENCES "RenderJob"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PromoClip" ADD CONSTRAINT "PromoClip_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiProvider" ADD CONSTRAINT "AiProvider_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UsageRecord" ADD CONSTRAINT "UsageRecord_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Job" ADD CONSTRAINT "Job_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
