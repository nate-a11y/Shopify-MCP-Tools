import type { GraphQLClient } from "graphql-request";
import { gql } from "graphql-request";
import { z } from "zod";

// Input schema for deleteMetaobject
const DeleteMetaobjectInputSchema = z.object({
  id: z.string().min(1).describe("The GID of the metaobject to delete (e.g., 'gid://shopify/Metaobject/123456')")
});

type DeleteMetaobjectInput = z.infer<typeof DeleteMetaobjectInputSchema>;

interface MetaobjectDeleteResponse {
  metaobjectDelete: {
    deletedId: string | null;
    userErrors: Array<{
      field: string[];
      message: string;
      code: string;
    }>;
  };
}

// Will be initialized in index.ts
let shopifyClient: GraphQLClient;

/**
 * Tool for deleting a metaobject entry
 * @returns {Object} Deletion result with the deleted ID
 */
const deleteMetaobject = {
  name: "delete-metaobject",
  description: "Delete a metaobject entry. This permanently removes the metaobject and cannot be undone.",
  schema: DeleteMetaobjectInputSchema,

  initialize(client: GraphQLClient) {
    shopifyClient = client;
  },

  execute: async (input: DeleteMetaobjectInput) => {
    if (!shopifyClient) {
      throw new Error("GraphQL client not initialized. Call initialize() first.");
    }
    try {
      const { id } = input;

      const mutation = gql`
        mutation MetaobjectDelete($id: ID!) {
          metaobjectDelete(id: $id) {
            deletedId
            userErrors {
              field
              message
              code
            }
          }
        }
      `;

      const variables = { id };

      const data = (await shopifyClient.request(mutation, variables)) as MetaobjectDeleteResponse;

      if (data.metaobjectDelete.userErrors.length > 0) {
        throw new Error(
          `Failed to delete metaobject: ${data.metaobjectDelete.userErrors
            .map((error) => `${error.message} (${error.code})`)
            .join(", ")}`
        );
      }

      if (!data.metaobjectDelete.deletedId) {
        throw new Error("Metaobject deletion failed: No deleted ID returned");
      }

      return {
        success: true,
        deletedId: data.metaobjectDelete.deletedId
      };
    } catch (error) {
      console.error("Error deleting metaobject:", error);
      throw new Error(
        `Failed to delete metaobject: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }
};

export { deleteMetaobject };
