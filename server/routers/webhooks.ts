import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { getDb } from "../db";
import { users } from "../../drizzle/schema";
import { eq } from "drizzle-orm";

export const webhooksRouter = router({
  /**
   * Get current webhook URL for the user
   */
  getUrl: protectedProcedure.query(async ({ ctx }) => {
    try {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      const user = await db.select().from(users).where(eq(users.id, ctx.user.id)).limit(1);
      if (!user || user.length === 0) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Usuario nao encontrado" });
      }
      
      return { webhookUrl: user[0].webhookUrl || null };
    } catch (error) {
      console.error("[Webhooks] Error getting URL:", error);
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Erro ao obter webhook" });
    }
  }),

  /**
   * Set webhook URL for the user (admin only)
   */
  setUrl: protectedProcedure
    .input(z.object({ webhookUrl: z.string().url().or(z.literal("")) }))
    .mutation(async ({ ctx, input }) => {
      try {
        if (ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Apenas admin pode configurar webhook" });
        }

        const db = await getDb();
        if (!db) throw new Error("Database not available");

        await db.update(users).set({ webhookUrl: input.webhookUrl || null }).where(eq(users.id, ctx.user.id));

        return { success: true, webhookUrl: input.webhookUrl || null };
      } catch (error) {
        console.error("[Webhooks] Error setting URL:", error);
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Erro ao configurar webhook" });
      }
    }),

  /**
   * Test webhook URL by sending a test payload
   */
  testUrl: protectedProcedure
    .input(z.object({ webhookUrl: z.string().url() }))
    .mutation(async ({ ctx, input }) => {
      try {
        if (ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Apenas admin pode testar webhook" });
        }

        const testPayload = {
          event: "webhook.test",
          timestamp: new Date().toISOString(),
          user_email: ctx.user.email,
          message: "Teste de conexao webhook",
        };

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);

        try {
          const response = await fetch(input.webhookUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(testPayload),
            signal: controller.signal,
          });

          clearTimeout(timeoutId);

          const responseText = await response.text();

          return {
            success: response.ok,
            status: response.status,
            statusText: response.statusText,
            response: responseText,
            message: response.ok ? "Webhook respondeu com sucesso" : "Webhook respondeu com erro",
          };
        } catch (error) {
          clearTimeout(timeoutId);
          
          if (error instanceof Error && error.name === "AbortError") {
            throw new TRPCError({
              code: "TIMEOUT",
              message: "Webhook nao respondeu em 10 segundos",
            });
          }

          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `Erro ao conectar ao webhook: ${error instanceof Error ? error.message : "Erro desconhecido"}`,
          });
        }
      } catch (error) {
        console.error("[Webhooks] Error testing URL:", error);
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Erro ao testar webhook" });
      }
    }),
});
