import type { GraphQLClient } from "graphql-request";
import { gql } from "graphql-request";
import { z } from "zod";

// Input schema for deleteProduct
const DeleteProductInputSchema = z.object({
  productId: z.string().min(1).describe("The GID of the product to delete (e.g., 'gid://shopify/Product/123456')")
});

type DeleteProductInput = z.infer<typeof DeleteProductInputSchema>;

interface ProductDeleteResponse {
  productDelete: {
    deletedProductId: string | null;
    userErrors: Array<{
      field: string[];
      message: string;
    }>;
  };
}

// Will be initialized in index.ts
let shopifyClient: GraphQLClient;

/**
 * Tool for deleting a product
 * @returns {Object} Deletion result with the deleted product ID
 */
const deleteProduct = {
  name: "delete-product",
  description: "Delete a product from the Shopify store. This permanently removes the product and all its variants. This action cannot be undone.",
  schema: DeleteProductInputSchema,

  initialize(client: GraphQLClient) {
    shopifyClient = client;
  },

  execute: async (input: DeleteProductInput) => {
    if (!shopifyClient) {
      throw new Error("GraphQL client not initialized. Call initialize() first.");
    }
    try {
      const { productId } = input;

      const mutation = gql`
        mutation productDelete($input: ProductDeleteInput!) {
          productDelete(input: $input) {
            deletedProductId
            userErrors {
              field
              message
            }
          }
        }
      `;

      const variables = {
        input: {
          id: productId
        }
      };

      const data = (await shopifyClient.request(mutation, variables)) as ProductDeleteResponse;

      if (data.productDelete.userErrors.length > 0) {
        throw new Error(
          `Failed to delete product: ${data.productDelete.userErrors
            .map((error) => error.message)
            .join(", ")}`
        );
      }

      if (!data.productDelete.deletedProductId) {
        throw new Error("Product deletion failed: No deleted product ID returned");
      }

      return {
        success: true,
        deletedProductId: data.productDelete.deletedProductId
      };
    } catch (error) {
      console.error("Error deleting product:", error);
      throw new Error(
        `Failed to delete product: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }
};

export { deleteProduct };
