-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'SDR');

-- CreateEnum
CREATE TYPE "LeadStage" AS ENUM ('NOVO', 'PRE_QUALIFICADO', 'DESQUALIFICADO', 'CONTATO_INICIADO', 'REUNIAO_AGENDADA', 'PROPOSTA_ENVIADA', 'GANHO', 'PERDIDO');

-- CreateEnum
CREATE TYPE "LeadPriority" AS ENUM ('ALTA', 'EM_DESENVOLVIMENTO', 'BAIXA_PRONTIDAO', 'INCOMPLETA');

-- CreateEnum
CREATE TYPE "MeetingCondition" AS ENUM ('ATENDIDAS', 'RESOLVER_CRITERIOS_MINIMOS', 'CONCLUIR_NOTAS');

-- CreateEnum
CREATE TYPE "ForwardingAction" AS ENUM ('AGENDAR_CLOSER', 'COMBINAR_RETORNO', 'REVISAR_NOTAS', 'PREENCHER_FICHA');

-- CreateEnum
CREATE TYPE "NotificationStatus" AS ENUM ('PENDING', 'SENT', 'FAILED');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'SDR',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "leads" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "whatsapp" TEXT NOT NULL,
    "deliveryNome" TEXT NOT NULL,
    "segmento" TEXT NOT NULL,
    "cidade" TEXT NOT NULL,
    "stage" "LeadStage" NOT NULL DEFAULT 'NOVO',
    "origem" TEXT NOT NULL DEFAULT 'LANDING_PAGE',
    "notificationStatus" "NotificationStatus" NOT NULL DEFAULT 'PENDING',
    "notificationError" TEXT,
    "instagramCardapio" TEXT,
    "faturamentoMensal" DOUBLE PRECISION,
    "pedidosMensais" INTEGER,
    "ticketMedio" DOUBLE PRECISION,
    "midiaAtualMensal" DOUBLE PRECISION,
    "canalEntrada" TEXT DEFAULT 'Landing Page',
    "decisoresCargos" TEXT,
    "prazoDesejadoInicio" TEXT,
    "problemaPrincipal" TEXT,
    "metaCliente" TEXT,
    "historicoAgencias" TEXT,
    "recursosDeclarados" TEXT,
    "sdrResponsibleId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "leads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lead_qualifications" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "scorePerfil" INTEGER,
    "justificativaPerfil" TEXT,
    "scoreCapacidadeOperacional" INTEGER,
    "justificativaOperacional" TEXT,
    "scoreNecessidadeObjetivo" INTEGER,
    "justificativaNecessidade" TEXT,
    "scoreCapacidadeInvestir" INTEGER,
    "justificativaInvestir" TEXT,
    "scoreAcessoDecisor" INTEGER,
    "justificativaDecisor" TEXT,
    "scoreMomentoContratacao" INTEGER,
    "justificativaMomento" TEXT,
    "totalScore" INTEGER,
    "priority" "LeadPriority" NOT NULL DEFAULT 'INCOMPLETA',
    "meetingCondition" "MeetingCondition" NOT NULL DEFAULT 'CONCLUIR_NOTAS',
    "forwardingAction" "ForwardingAction" NOT NULL DEFAULT 'PREENCHER_FICHA',
    "pendenciasCloser" TEXT,
    "proximaAcao" TEXT,
    "dataProximoContato" TIMESTAMP(3),
    "motivoPerda" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lead_qualifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lead_follow_ups" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "userId" TEXT,
    "notes" TEXT NOT NULL,
    "scheduledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lead_follow_ups_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "lead_qualifications_leadId_key" ON "lead_qualifications"("leadId");

-- AddForeignKey
ALTER TABLE "leads" ADD CONSTRAINT "leads_sdrResponsibleId_fkey" FOREIGN KEY ("sdrResponsibleId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lead_qualifications" ADD CONSTRAINT "lead_qualifications_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "leads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lead_follow_ups" ADD CONSTRAINT "lead_follow_ups_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "leads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lead_follow_ups" ADD CONSTRAINT "lead_follow_ups_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
