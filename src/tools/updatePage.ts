import type { GraphQLClient } from "graphql-request";
import { gql } from "graphql-request";
import { z } from "zod";

// Input schema for updatePage
const UpdatePageInputSchema = z.object({
  pageId: z.string().min(1).describe("The GID of the page to update (e.g., \"gid://shopify/Page/1234567890\")"),
  title: z.string().optional().describe("The new title for the page"),
  body: z.string().optional().describe("The new HTML body content for the page"),
  isPublished: z.boolean().optional().describe("Whether the page should be published or unpublished")
});

type UpdatePageInput = z.infer<typeof UpdatePageInputSchema>;

// Will be initialized in index.ts
let shopifyClient: GraphQLClient;

/**
 * Tool for updating page details
 * @returns {Object} Updated page information
 */
const updatePage = {
  name: "update-page",
  description: "Updates a page's details including title, body content, and publish status",
  schema: UpdatePageInputSchema,

  initialize(client: GraphQLClient) {
    shopifyClient = client;
  },

  execute: async (input: UpdatePageInput) => {
    try {
      const { pageId, title, body, isPublished } = input;

      const mutation = gql`
        mutation pageUpdate($id: ID!, $page: PageUpdateInput!) {
          pageUpdate(id: $id, page: $page) {
            page {
              id
              title
              handle
              body
              bodySummary
              updatedAt
              publishedAt
              createdAt
            }
            userErrors {
              field
              message
            }
          }
        }
      `;

      // Build the page input object
      const pageInput: {
        title?: string;
        body?: string;
        isPublished?: boolean;
      } = {};

      if (title !== undefined) {
        pageInput.title = title;
      }

      if (body !== undefined) {
        pageInput.body = body;
      }

      if (isPublished !== undefined) {
        pageInput.isPublished = isPublished;
      }

      const variables = {
        id: pageId,
        page: pageInput
      };

      const data = await shopifyClient.request(mutation, variables) as {
        pageUpdate: {
          page: {
            id: string;
            title: string;
            handle: string;
            body: string;
            bodySummary: string;
            updatedAt: string;
            publishedAt: string | null;
            createdAt: string;
          } | null;
          userErrors: Array<{
            field: string[];
            message: string;
          }>;
        };
      };

      if (data.pageUpdate.userErrors.length > 0) {
        throw new Error(
          `Failed to update page: ${data.pageUpdate.userErrors
            .map((error) => error.message)
            .join(", ")}`
        );
      }

      if (!data.pageUpdate.page) {
        throw new Error("Page update failed: No page returned");
      }

      return {
        success: true,
        page: data.pageUpdate.page
      };
    } catch (error) {
      console.error("Error updating page:", error);
      throw new Error(
        `Failed to update page: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }
};

export { updatePage };
