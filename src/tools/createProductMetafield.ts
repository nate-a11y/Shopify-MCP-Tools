import type { GraphQLClient } from "graphql-request";
import { gql } from "graphql-request";
import { z } from "zod";

// Input schema for createProductMetafield
const CreateProductMetafieldInputSchema = z.object({
  productId: z.string().min(1).describe("The GID of the product (e.g., \"gid://shopify/Product/1234567890\")"),
  namespace: z.string().min(1).describe("The namespace for the metafield (e.g., \"custom\", \"my_app\")"),
  key: z.string().min(1).describe("The key for the metafield within the namespace"),
  value: z.string().min(1).describe("The value of the metafield"),
  type: z.string().min(1).describe("The metafield type (e.g., \"single_line_text_field\", \"number_integer\", \"json\", \"boolean\", \"date\", \"url\", \"color\", \"rich_text_field\", \"list.single_line_text_field\")")
});

type CreateProductMetafieldInput = z.infer<typeof CreateProductMetafieldInputSchema>;

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
 * Tool for creating a metafield on a product
 * @returns {Object} Created metafield details
 */
const createProductMetafield = {
  name: "create-product-metafield",
  description: "Create a new metafield on a product. Common types: single_line_text_field, multi_line_text_field, number_integer, number_decimal, json, boolean, date, date_time, url, color, rich_text_field",
  schema: CreateProductMetafieldInputSchema,

  initialize(client: GraphQLClient) {
    shopifyClient = client;
  },

  execute: async (input: CreateProductMetafieldInput) => {
    try {
      const { productId, namespace, key, value, type } = input;

      // Use metafieldsSet mutation which is the recommended way for Shopify 2023+ API
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

      const variables = {
        metafields: [
          {
            ownerId: productId,
            namespace,
            key,
            value,
            type
          }
        ]
      };

      const data = (await shopifyClient.request(mutation, variables)) as MetafieldsSetResponse;

      if (data.metafieldsSet.userErrors.length > 0) {
        throw new Error(
          `Failed to create metafield: ${data.metafieldsSet.userErrors
            .map((error) => error.message)
            .join(", ")}`
        );
      }

      if (!data.metafieldsSet.metafields || data.metafieldsSet.metafields.length === 0) {
        throw new Error("Metafield creation failed: No metafield returned");
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
      console.error("Error creating product metafield:", error);
      throw new Error(
        `Failed to create product metafield: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }
};

export { createProductMetafield };
