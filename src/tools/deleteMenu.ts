import type { GraphQLClient } from "graphql-request";
import { gql } from "graphql-request";
import { z } from "zod";

// Input schema for deleteMenu
const DeleteMenuInputSchema = z.object({
  id: z.string().min(1).describe("The GID of the menu to delete (e.g., 'gid://shopify/Menu/123456')")
});

type DeleteMenuInput = z.infer<typeof DeleteMenuInputSchema>;

interface MenuDeleteResponse {
  menuDelete: {
    deletedMenuId: string | null;
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
 * Tool for deleting a navigation menu
 * @returns {Object} Deletion result with the deleted ID
 */
const deleteMenu = {
  name: "delete-menu",
  description: "Delete a navigation menu. This permanently removes the menu and all its items. This action cannot be undone.",
  schema: DeleteMenuInputSchema,

  initialize(client: GraphQLClient) {
    shopifyClient = client;
  },

  execute: async (input: DeleteMenuInput) => {
    if (!shopifyClient) {
      throw new Error("GraphQL client not initialized. Call initialize() first.");
    }
    try {
      const { id } = input;

      const mutation = gql`
        mutation MenuDelete($id: ID!) {
          menuDelete(id: $id) {
            deletedMenuId
            userErrors {
              field
              message
              code
            }
          }
        }
      `;

      const variables = { id };

      const data = (await shopifyClient.request(mutation, variables)) as MenuDeleteResponse;

      if (data.menuDelete.userErrors.length > 0) {
        throw new Error(
          `Failed to delete menu: ${data.menuDelete.userErrors
            .map((error) => `${error.message} (${error.code})`)
            .join(", ")}`
        );
      }

      if (!data.menuDelete.deletedMenuId) {
        throw new Error("Menu deletion failed: No deleted ID returned");
      }

      return {
        success: true,
        deletedMenuId: data.menuDelete.deletedMenuId
      };
    } catch (error) {
      console.error("Error deleting menu:", error);
      throw new Error(
        `Failed to delete menu: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }
};

export { deleteMenu };
