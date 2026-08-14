-- AddForeignKey
ALTER TABLE "Triagem" ADD CONSTRAINT "Triagem_autorId_fkey" FOREIGN KEY ("autorId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
