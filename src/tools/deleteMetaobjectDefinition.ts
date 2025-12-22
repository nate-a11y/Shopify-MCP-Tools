import type { GraphQLClient } from "graphql-request";
import { gql } from "graphql-request";
import { z } from "zod";

// Input schema for deleteMetaobjectDefinition
const DeleteMetaobjectDefinitionInputSchema = z.object({
  id: z.string().min(1).describe("The GID of the metaobject definition to delete (e.g., 'gid://shopify/MetaobjectDefinition/123456')"),
  deleteAllAssociatedMetaobjects: z.boolean().optional().describe("Whether to also delete all metaobject entries of this type. Defaults to false, which will fail if entries exist.")
});

type DeleteMetaobjectDefinitionInput = z.infer<typeof DeleteMetaobjectDefinitionInputSchema>;

interface MetaobjectDefinitionDeleteResponse {
  metaobjectDefinitionDelete: {
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
 * Tool for deleting a metaobject definition
 * @returns {Object} Deletion result with the deleted ID
 */
const deleteMetaobjectDefinition = {
  name: "delete-metaobject-definition",
  description: "Delete a metaobject definition (schema). Optionally delete all metaobject entries of this type. Warning: This is permanent and cannot be undone.",
  schema: DeleteMetaobjectDefinitionInputSchema,

  initialize(client: GraphQLClient) {
    shopifyClient = client;
  },

  execute: async (input: DeleteMetaobjectDefinitionInput) => {
    if (!shopifyClient) {
      throw new Error("GraphQL client not initialized. Call initialize() first.");
    }
    try {
      const { id, deleteAllAssociatedMetaobjects } = input;

      const mutation = gql`
        mutation MetaobjectDefinitionDelete($id: ID!, $deleteAllAssociatedMetaobjects: Boolean) {
          metaobjectDefinitionDelete(id: $id, deleteAllAssociatedMetaobjects: $deleteAllAssociatedMetaobjects) {
            deletedId
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
        deleteAllAssociatedMetaobjects?: boolean;
      } = { id };

      if (deleteAllAssociatedMetaobjects !== undefined) {
        variables.deleteAllAssociatedMetaobjects = deleteAllAssociatedMetaobjects;
      }

      const data = (await shopifyClient.request(mutation, variables)) as MetaobjectDefinitionDeleteResponse;

      if (data.metaobjectDefinitionDelete.userErrors.length > 0) {
        throw new Error(
          `Failed to delete metaobject definition: ${data.metaobjectDefinitionDelete.userErrors
            .map((error) => `${error.message} (${error.code})`)
            .join(", ")}`
        );
      }

      if (!data.metaobjectDefinitionDelete.deletedId) {
        throw new Error("Metaobject definition deletion failed: No deleted ID returned");
      }

      return {
        success: true,
        deletedId: data.metaobjectDefinitionDelete.deletedId
      };
    } catch (error) {
      console.error("Error deleting metaobject definition:", error);
      throw new Error(
        `Failed to delete metaobject definition: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }
};

export { deleteMetaobjectDefinition };
