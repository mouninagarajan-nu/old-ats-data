-- CreateTable
CREATE TABLE "Candidate" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "firstName" TEXT,
    "middleName" TEXT,
    "lastName" TEXT,
    "phone" TEXT,
    "mobile" TEXT,
    "gender" TEXT,
    "dateOfBirth" TEXT,
    "skypeId" TEXT,
    "street" TEXT,
    "city" TEXT,
    "state" TEXT,
    "country" TEXT,
    "zipCode" TEXT,
    "profileUrls" TEXT,
    "skills" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Candidate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Job" (
    "id" TEXT NOT NULL,
    "freshteamJobId" TEXT,
    "title" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "clientName" TEXT,
    "descriptionHtml" TEXT,
    "folderName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Job_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Application" (
    "id" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "applicantId" TEXT,
    "applicantSourceName" TEXT,
    "applicantSourceCategory" TEXT,
    "candidateSourceName" TEXT,
    "candidateSourceCategory" TEXT,
    "ownerName" TEXT,
    "candidateStatus" TEXT,
    "hiringStage" TEXT,
    "hiringSubstage" TEXT,
    "referrerName" TEXT,
    "rejectReason" TEXT,
    "jobFitmentRating" TEXT,
    "totalExperience" TEXT,
    "appliedAt" TIMESTAMP(3),
    "lastUpdatedAt" TIMESTAMP(3),
    "resumePath" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Application_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Employer" (
    "id" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "employerName" TEXT,
    "designation" TEXT,
    "jobDescription" TEXT,
    "startDate" TEXT,
    "endDate" TEXT,
    "currentEmployer" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Employer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Qualification" (
    "id" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "instituteName" TEXT,
    "fieldOfStudy" TEXT,
    "degree" TEXT,
    "summary" TEXT,
    "grade" TEXT,
    "startDate" TEXT,
    "endDate" TEXT,
    "inProgress" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Qualification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InterviewFeedback" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "interviewStageCategory" TEXT,
    "interviewStage" TEXT,
    "panelMemberEmail" TEXT,
    "feedbackDecision" TEXT,
    "feedbackSubmittedTime" TEXT,
    "feedbackEvaluation" JSONB,
    "feedbackCommentsHtml" TEXT,
    "assessmentAttachment" TEXT,
    "stageDeleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "InterviewFeedback_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OutreachNote" (
    "id" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "authorName" TEXT NOT NULL,
    "noteText" TEXT NOT NULL,
    "contacted" BOOLEAN NOT NULL DEFAULT false,
    "contactedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OutreachNote_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Candidate_email_key" ON "Candidate"("email");

-- CreateIndex
CREATE INDEX "Candidate_email_idx" ON "Candidate"("email");

-- CreateIndex
CREATE INDEX "Candidate_firstName_lastName_idx" ON "Candidate"("firstName", "lastName");

-- CreateIndex
CREATE UNIQUE INDEX "Job_freshteamJobId_key" ON "Job"("freshteamJobId");

-- CreateIndex
CREATE INDEX "Job_title_idx" ON "Job"("title");

-- CreateIndex
CREATE INDEX "Job_status_idx" ON "Job"("status");

-- CreateIndex
CREATE INDEX "Application_candidateStatus_idx" ON "Application"("candidateStatus");

-- CreateIndex
CREATE INDEX "Application_hiringStage_idx" ON "Application"("hiringStage");

-- CreateIndex
CREATE INDEX "Application_applicantId_idx" ON "Application"("applicantId");

-- CreateIndex
CREATE UNIQUE INDEX "Application_candidateId_jobId_applicantId_key" ON "Application"("candidateId", "jobId", "applicantId");

-- CreateIndex
CREATE INDEX "Employer_candidateId_idx" ON "Employer"("candidateId");

-- CreateIndex
CREATE INDEX "Qualification_candidateId_idx" ON "Qualification"("candidateId");

-- CreateIndex
CREATE INDEX "InterviewFeedback_applicationId_idx" ON "InterviewFeedback"("applicationId");

-- CreateIndex
CREATE INDEX "InterviewFeedback_feedbackDecision_idx" ON "InterviewFeedback"("feedbackDecision");

-- CreateIndex
CREATE INDEX "OutreachNote_candidateId_idx" ON "OutreachNote"("candidateId");

-- CreateIndex
CREATE INDEX "OutreachNote_contacted_idx" ON "OutreachNote"("contacted");

-- AddForeignKey
ALTER TABLE "Application" ADD CONSTRAINT "Application_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "Candidate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Application" ADD CONSTRAINT "Application_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Employer" ADD CONSTRAINT "Employer_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "Candidate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Qualification" ADD CONSTRAINT "Qualification_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "Candidate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InterviewFeedback" ADD CONSTRAINT "InterviewFeedback_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OutreachNote" ADD CONSTRAINT "OutreachNote_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "Candidate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
