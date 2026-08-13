-- CreateEnum
CREATE TYPE "Papel" AS ENUM ('ENFERMEIRO', 'MEDICO', 'ADMIN');

-- CreateEnum
CREATE TYPE "StatusAtendimento" AS ENUM ('AGUARDANDO', 'EM_ANDAMENTO', 'FINALIZADO', 'CANCELADO');

-- CreateEnum
CREATE TYPE "Risco" AS ENUM ('AZUL', 'VERDE', 'AMARELO', 'LARANJA', 'VERMELHO');

-- CreateEnum
CREATE TYPE "Participante" AS ENUM ('PROFISSIONAL', 'PACIENTE');

-- CreateTable
CREATE TABLE "Usuario" (
    "id" UUID NOT NULL,
    "nome" VARCHAR(120) NOT NULL,
    "email" VARCHAR(160) NOT NULL,
    "senhaHash" VARCHAR(72) NOT NULL,
    "papel" "Papel" NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criadoEm" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Usuario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Paciente" (
    "id" UUID NOT NULL,
    "nome" VARCHAR(120) NOT NULL,
    "cpf" CHAR(11) NOT NULL,
    "contato" VARCHAR(40) NOT NULL,
    "nascimento" DATE NOT NULL,
    "criadoEm" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Paciente_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Atendimento" (
    "id" UUID NOT NULL,
    "status" "StatusAtendimento" NOT NULL DEFAULT 'AGUARDANDO',
    "risco" "Risco",
    "pacienteId" UUID NOT NULL,
    "profissionalId" UUID,
    "entradaFila" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "iniciadoEm" TIMESTAMPTZ(3),
    "finalizadoEm" TIMESTAMPTZ(3),
    "canceladoEm" TIMESTAMPTZ(3),
    "encaminhadoDeId" UUID,

    CONSTRAINT "Atendimento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Triagem" (
    "id" UUID NOT NULL,
    "atendimentoId" UUID NOT NULL,
    "queixa" TEXT NOT NULL,
    "pa" VARCHAR(7),
    "fc" INTEGER,
    "temperatura" DECIMAL(4,1),
    "satO2" INTEGER,
    "autorId" UUID NOT NULL,
    "criadoEm" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Triagem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Prontuario" (
    "id" UUID NOT NULL,
    "atendimentoId" UUID NOT NULL,
    "autorId" UUID NOT NULL,
    "anamnese" TEXT NOT NULL,
    "conduta" TEXT NOT NULL,
    "prescricao" TEXT,
    "finalizadoEm" TIMESTAMPTZ(3),
    "criadoEm" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Prontuario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProntuarioAdendo" (
    "id" UUID NOT NULL,
    "prontuarioId" UUID NOT NULL,
    "autorId" UUID NOT NULL,
    "texto" TEXT NOT NULL,
    "criadoEm" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProntuarioAdendo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SalaToken" (
    "id" UUID NOT NULL,
    "atendimentoId" UUID NOT NULL,
    "tokenHash" CHAR(64) NOT NULL,
    "participante" "Participante" NOT NULL,
    "usuarioId" UUID,
    "expiraEm" TIMESTAMPTZ(3) NOT NULL,
    "usadoEm" TIMESTAMPTZ(3),
    "revogadoEm" TIMESTAMPTZ(3),
    "criadoEm" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SalaToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LogAuditoria" (
    "id" UUID NOT NULL,
    "usuarioId" UUID,
    "papel" VARCHAR(20),
    "acao" VARCHAR(60) NOT NULL,
    "pacienteId" UUID,
    "atendimentoId" UUID,
    "endpoint" VARCHAR(200) NOT NULL,
    "metodo" VARCHAR(10) NOT NULL,
    "statusHttp" INTEGER NOT NULL,
    "ip" VARCHAR(45),
    "userAgent" VARCHAR(300),
    "criadoEm" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LogAuditoria_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_email_key" ON "Usuario"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Paciente_cpf_key" ON "Paciente"("cpf");

-- CreateIndex
CREATE INDEX "Paciente_nome_idx" ON "Paciente"("nome");

-- CreateIndex
CREATE UNIQUE INDEX "Atendimento_encaminhadoDeId_key" ON "Atendimento"("encaminhadoDeId");

-- CreateIndex
CREATE INDEX "Atendimento_status_entradaFila_idx" ON "Atendimento"("status", "entradaFila");

-- CreateIndex
CREATE INDEX "Atendimento_pacienteId_idx" ON "Atendimento"("pacienteId");

-- CreateIndex
CREATE INDEX "Atendimento_profissionalId_idx" ON "Atendimento"("profissionalId");

-- CreateIndex
CREATE UNIQUE INDEX "Triagem_atendimentoId_key" ON "Triagem"("atendimentoId");

-- CreateIndex
CREATE UNIQUE INDEX "Prontuario_atendimentoId_key" ON "Prontuario"("atendimentoId");

-- CreateIndex
CREATE INDEX "ProntuarioAdendo_prontuarioId_criadoEm_idx" ON "ProntuarioAdendo"("prontuarioId", "criadoEm");

-- CreateIndex
CREATE UNIQUE INDEX "SalaToken_tokenHash_key" ON "SalaToken"("tokenHash");

-- CreateIndex
CREATE INDEX "SalaToken_atendimentoId_idx" ON "SalaToken"("atendimentoId");

-- CreateIndex
CREATE INDEX "LogAuditoria_pacienteId_criadoEm_idx" ON "LogAuditoria"("pacienteId", "criadoEm");

-- CreateIndex
CREATE INDEX "LogAuditoria_usuarioId_criadoEm_idx" ON "LogAuditoria"("usuarioId", "criadoEm");

-- AddForeignKey
ALTER TABLE "Atendimento" ADD CONSTRAINT "Atendimento_encaminhadoDeId_fkey" FOREIGN KEY ("encaminhadoDeId") REFERENCES "Atendimento"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Atendimento" ADD CONSTRAINT "Atendimento_pacienteId_fkey" FOREIGN KEY ("pacienteId") REFERENCES "Paciente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Atendimento" ADD CONSTRAINT "Atendimento_profissionalId_fkey" FOREIGN KEY ("profissionalId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Triagem" ADD CONSTRAINT "Triagem_atendimentoId_fkey" FOREIGN KEY ("atendimentoId") REFERENCES "Atendimento"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Prontuario" ADD CONSTRAINT "Prontuario_atendimentoId_fkey" FOREIGN KEY ("atendimentoId") REFERENCES "Atendimento"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Prontuario" ADD CONSTRAINT "Prontuario_autorId_fkey" FOREIGN KEY ("autorId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProntuarioAdendo" ADD CONSTRAINT "ProntuarioAdendo_prontuarioId_fkey" FOREIGN KEY ("prontuarioId") REFERENCES "Prontuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProntuarioAdendo" ADD CONSTRAINT "ProntuarioAdendo_autorId_fkey" FOREIGN KEY ("autorId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalaToken" ADD CONSTRAINT "SalaToken_atendimentoId_fkey" FOREIGN KEY ("atendimentoId") REFERENCES "Atendimento"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalaToken" ADD CONSTRAINT "SalaToken_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LogAuditoria" ADD CONSTRAINT "LogAuditoria_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LogAuditoria" ADD CONSTRAINT "LogAuditoria_pacienteId_fkey" FOREIGN KEY ("pacienteId") REFERENCES "Paciente"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LogAuditoria" ADD CONSTRAINT "LogAuditoria_atendimentoId_fkey" FOREIGN KEY ("atendimentoId") REFERENCES "Atendimento"("id") ON DELETE SET NULL ON UPDATE CASCADE;
