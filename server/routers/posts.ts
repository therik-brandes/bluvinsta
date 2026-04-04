import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { getUserPosts, getPostById, createPost, updatePost, deletePost, logWebhookCall } from "../db";
import { TRPCError } from "@trpc/server";

export const postsRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    try {
      const userPosts = await getUserPosts(ctx.user.id);
      return userPosts || [];
    } catch (error) {
      console.error("[Posts] Error listing posts:", error);
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Erro ao listar posts" });
    }
  }),

  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      try {
        const post = await getPostById(input.id, ctx.user.id);
        if (!post) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Post nao encontrado" });
        }
        return post;
      } catch (error) {
        console.error("[Posts] Error getting post:", error);
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Erro ao buscar post" });
      }
    }),

  create: protectedProcedure
    .input(
      z.object({
        videoKey: z.string().min(1),
        videoUrl: z.string().url(),
        videoSize: z.number().positive(),
        videoMimeType: z.string(),
        caption: z.string().optional(),
        scheduledDate: z.string(),
        scheduledTime: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const MAX_SIZE = 5 * 1024 * 1024 * 1024;
        if (input.videoSize > MAX_SIZE) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Video excede o tamanho maximo de 5GB",
          });
        }

        const result = await createPost({
          userId: ctx.user.id,
          videoKey: input.videoKey,
          videoUrl: input.videoUrl,
          videoSize: input.videoSize,
          videoMimeType: input.videoMimeType,
          caption: input.caption || null,
          scheduledDate: input.scheduledDate,
          scheduledTime: input.scheduledTime,
          status: "scheduled",
        });

        const postId = (result as any).insertId || 0;

        if (ctx.user.webhookUrl) {
          try {
            const payload = {
              event: "post.scheduled",
              post_id: postId,
              user_email: ctx.user.email,
              video_url: input.videoUrl,
              video_size: input.videoSize,
              caption: input.caption || null,
              scheduled_date: input.scheduledDate,
              scheduled_time: input.scheduledTime,
              timestamp: new Date().toISOString(),
            };

            const response = await fetch(ctx.user.webhookUrl, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(payload),
            }).catch(() => null);

            await logWebhookCall({
              userId: ctx.user.id,
              postId: postId,
              webhookUrl: ctx.user.webhookUrl,
              payload: payload as any,
              responseStatus: response?.status || null,
              responseBody: response ? await response.text() : null,
            });
          } catch (error) {
            console.error("[Webhook] Error:", error);
          }
        }

        return { success: true, postId };
      } catch (error) {
        console.error("[Posts] Error creating post:", error);
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Erro ao criar post" });
      }
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        caption: z.string().optional(),
        scheduledDate: z.string().optional(),
        scheduledTime: z.string().optional(),
        status: z.enum(["pending", "scheduled", "published", "failed"]).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const { id, ...updateData } = input;
        const updatePayload: any = {};
        if (updateData.caption !== undefined) updatePayload.caption = updateData.caption;
        if (updateData.scheduledDate !== undefined) updatePayload.scheduledDate = updateData.scheduledDate;
        if (updateData.scheduledTime !== undefined) updatePayload.scheduledTime = updateData.scheduledTime;
        if (updateData.status !== undefined) updatePayload.status = updateData.status;
        
        await updatePost(id, ctx.user.id, updatePayload);
        return { success: true };
      } catch (error) {
        console.error("[Posts] Error updating post:", error);
        if (error instanceof Error && error.message.includes("unauthorized")) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Sem permissao para editar" });
        }
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Erro ao atualizar post" });
      }
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      try {
        await deletePost(input.id, ctx.user.id);
        return { success: true };
      } catch (error) {
        console.error("[Posts] Error deleting post:", error);
        if (error instanceof Error && error.message.includes("unauthorized")) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Sem permissao para deletar" });
        }
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Erro ao deletar post" });
      }
    }),
});
