import type { GraphQLClient } from "graphql-request";
import { gql } from "graphql-request";
import { z } from "zod";

// Input schema for deleteProductMetafield
const DeleteProductMetafieldInputSchema = z.object({
  metafieldId: z.string().min(1).describe("The GID of the metafield to delete (e.g., \"gid://shopify/Metafield/1234567890\")")
});

type DeleteProductMetafieldInput = z.infer<typeof DeleteProductMetafieldInputSchema>;

interface MetafieldDeleteResponse {
  metafieldDelete: {
    deletedId: string | null;
    userErrors: Array<{
      field: string[];
      message: string;
    }>;
  };
}

// Will be initialized in index.ts
let shopifyClient: GraphQLClient;

/**
 * Tool for deleting a metafield from a product
 * @returns {Object} Result indicating success and deleted metafield ID
 */
const deleteProductMetafield = {
  name: "delete-product-metafield",
  description: "Delete a metafield by its ID. Use get-product-metafields first to find the metafield ID.",
  schema: DeleteProductMetafieldInputSchema,

  initialize(client: GraphQLClient) {
    shopifyClient = client;
  },

  execute: async (input: DeleteProductMetafieldInput) => {
    try {
      const { metafieldId } = input;

      const mutation = gql`
        mutation MetafieldDelete($input: MetafieldDeleteInput!) {
          metafieldDelete(input: $input) {
            deletedId
            userErrors {
              field
              message
            }
          }
        }
      `;

      const variables = {
        input: {
          id: metafieldId
        }
      };

      const data = (await shopifyClient.request(mutation, variables)) as MetafieldDeleteResponse;

      if (data.metafieldDelete.userErrors.length > 0) {
        throw new Error(
          `Failed to delete metafield: ${data.metafieldDelete.userErrors
            .map((error) => error.message)
            .join(", ")}`
        );
      }

      if (!data.metafieldDelete.deletedId) {
        throw new Error("Metafield deletion failed: No deletedId returned. The metafield may not exist.");
      }

      return {
        success: true,
        deletedId: data.metafieldDelete.deletedId,
        message: "Metafield successfully deleted"
      };
    } catch (error) {
      console.error("Error deleting product metafield:", error);
      throw new Error(
        `Failed to delete product metafield: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }
};

export { deleteProductMetafield };
