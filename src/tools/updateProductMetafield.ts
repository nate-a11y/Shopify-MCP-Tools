import type { GraphQLClient } from "graphql-request";
import { gql } from "graphql-request";
import { z } from "zod";

// Input schema for updateProductMetafield
const UpdateProductMetafieldInputSchema = z.object({
  productId: z.string().min(1).describe("The GID of the product (e.g., \"gid://shopify/Product/1234567890\")"),
  namespace: z.string().min(1).describe("The namespace of the metafield to update"),
  key: z.string().min(1).describe("The key of the metafield to update"),
  value: z.string().min(1).describe("The new value for the metafield"),
  type: z.string().optional().describe("The metafield type (required if changing the type, e.g., \"single_line_text_field\", \"number_integer\", \"json\")")
});

type UpdateProductMetafieldInput = z.infer<typeof UpdateProductMetafieldInputSchema>;

interface MetafieldsSetResponse {
  metafieldsSet: {
    metafields: Array<{
      id: string;
      namespace: string;
      key: string;
      value: string;
      type: string;
      createdAt: string;
      updatedAt: string;
    }> | null;
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
 * Tool for updating a metafield on a product
 * Uses the metafieldsSet mutation which can create or update based on namespace/key
 * @returns {Object} Updated metafield details
 */
const updateProductMetafield = {
  name: "update-product-metafield",
  description: "Update an existing metafield on a product by namespace and key. The metafield must already exist.",
  schema: UpdateProductMetafieldInputSchema,

  initialize(client: GraphQLClient) {
    shopifyClient = client;
  },

  execute: async (input: UpdateProductMetafieldInput) => {
    try {
      const { productId, namespace, key, value, type } = input;

      // Use metafieldsSet mutation - it will update existing metafield if namespace/key match
      const mutation = gql`
        mutation MetafieldsSet($metafields: [MetafieldsSetInput!]!) {
          metafieldsSet(metafields: $metafields) {
            metafields {
              id
              namespace
              key
              value
              type
              createdAt
              updatedAt
            }
            userErrors {
              field
              message
              code
            }
          }
        }
      `;

      const metafieldInput: {
        ownerId: string;
        namespace: string;
        key: string;
        value: string;
        type?: string;
      } = {
        ownerId: productId,
        namespace,
        key,
        value
      };

      // Only include type if provided (needed for creating new or changing type)
      if (type) {
        metafieldInput.type = type;
      }

      const variables = {
        metafields: [metafieldInput]
      };

      const data = (await shopifyClient.request(mutation, variables)) as MetafieldsSetResponse;

      if (data.metafieldsSet.userErrors.length > 0) {
        throw new Error(
          `Failed to update metafield: ${data.metafieldsSet.userErrors
            .map((error) => error.message)
            .join(", ")}`
        );
      }

      if (!data.metafieldsSet.metafields || data.metafieldsSet.metafields.length === 0) {
        throw new Error("Metafield update failed: No metafield returned");
      }

      const metafield = data.metafieldsSet.metafields[0];

      return {
        success: true,
        metafield: {
          id: metafield.id,
          namespace: metafield.namespace,
          key: metafield.key,
          value: metafield.value,
          type: metafield.type,
          createdAt: metafield.createdAt,
          updatedAt: metafield.updatedAt
        }
      };
    } catch (error) {
      console.error("Error updating product metafield:", error);
      throw new Error(
        `Failed to update product metafield: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }
};

export { updateProductMetafield };
