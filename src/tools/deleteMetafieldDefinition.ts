import type { GraphQLClient } from "graphql-request";
import { gql } from "graphql-request";
import { z } from "zod";

// Input schema for deleteMetafieldDefinition
const DeleteMetafieldDefinitionInputSchema = z.object({
  id: z.string().min(1).describe("The GID of the metafield definition to delete (e.g., 'gid://shopify/MetafieldDefinition/123456')"),
  deleteAllAssociatedMetafields: z.boolean().optional().describe("Whether to also delete all metafield values associated with this definition. Defaults to false, which will fail if metafields exist.")
});

type DeleteMetafieldDefinitionInput = z.infer<typeof DeleteMetafieldDefinitionInputSchema>;

interface MetafieldDefinitionDeleteResponse {
  metafieldDefinitionDelete: {
    deletedDefinitionId: string | null;
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
 * Tool for deleting a metafield definition
 * @returns {Object} Deletion result with the deleted ID
 */
const deleteMetafieldDefinition = {
  name: "delete-metafield-definition",
  description: "Delete a metafield definition. Optionally delete all associated metafield values. Warning: This is permanent and cannot be undone.",
  schema: DeleteMetafieldDefinitionInputSchema,

  initialize(client: GraphQLClient) {
    shopifyClient = client;
  },

  execute: async (input: DeleteMetafieldDefinitionInput) => {
    if (!shopifyClient) {
      throw new Error("GraphQL client not initialized. Call initialize() first.");
    }
    try {
      const { id, deleteAllAssociatedMetafields } = input;

      const mutation = gql`
        mutation MetafieldDefinitionDelete($id: ID!, $deleteAllAssociatedMetafields: Boolean) {
          metafieldDefinitionDelete(id: $id, deleteAllAssociatedMetafields: $deleteAllAssociatedMetafields) {
            deletedDefinitionId
            userErrors {
              field
              message
              code
            }
          }
        }
      `;

      const variables: {
        id: string;
        deleteAllAssociatedMetafields?: boolean;
      } = { id };

      if (deleteAllAssociatedMetafields !== undefined) {
        variables.deleteAllAssociatedMetafields = deleteAllAssociatedMetafields;
      }

      const data = (await shopifyClient.request(mutation, variables)) as MetafieldDefinitionDeleteResponse;

      if (data.metafieldDefinitionDelete.userErrors.length > 0) {
        throw new Error(
          `Failed to delete metafield definition: ${data.metafieldDefinitionDelete.userErrors
            .map((error) => `${error.message} (${error.code})`)
            .join(", ")}`
        );
      }

      if (!data.metafieldDefinitionDelete.deletedDefinitionId) {
        throw new Error("Metafield definition deletion failed: No deleted ID returned");
      }

      return {
        success: true,
        deletedDefinitionId: data.metafieldDefinitionDelete.deletedDefinitionId
      };
    } catch (error) {
      console.error("Error deleting metafield definition:", error);
      throw new Error(
        `Failed to delete metafield definition: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }
};

export { deleteMetafieldDefinition };
