import type { GraphQLClient } from "graphql-request";
import { gql } from "graphql-request";
import { z } from "zod";

// Input schema for getProductMetafields
const GetProductMetafieldsInputSchema = z.object({
  productId: z.string().min(1).describe("The GID of the product (e.g., \"gid://shopify/Product/1234567890\")"),
  namespace: z.string().optional().describe("Filter metafields by namespace"),
  limit: z.number().min(1).max(250).default(20).describe("Maximum number of metafields to return (default: 20, max: 250)"),
  after: z.string().optional().describe("Cursor for pagination - fetch metafields after this cursor")
});

type GetProductMetafieldsInput = z.infer<typeof GetProductMetafieldsInputSchema>;

interface MetafieldNode {
  id: string;
  namespace: string;
  key: string;
  value: string;
  type: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
}

interface GetProductMetafieldsResponse {
  product: {
    id: string;
    title: string;
    metafields: {
      edges: Array<{
        node: MetafieldNode;
      }>;
      pageInfo: {
        hasNextPage: boolean;
        endCursor: string;
      };
    };
  } | null;
}

// Will be initialized in index.ts
let shopifyClient: GraphQLClient;

/**
 * Tool for fetching metafields associated with a product
 * @returns {Object} Product metafields
 */
const getProductMetafields = {
  name: "get-product-metafields",
  description: "Get metafields for a specific product, optionally filtered by namespace",
  schema: GetProductMetafieldsInputSchema,

  initialize(client: GraphQLClient) {
    shopifyClient = client;
  },

  execute: async (input: GetProductMetafieldsInput) => {
    if (!shopifyClient) {
      throw new Error("GraphQL client not initialized. Call initialize() first.");
    }
    try {
      const { productId, namespace, limit, after } = input;

      const query = gql`
        query GetProductMetafields($id: ID!, $first: Int!, $namespace: String, $after: String) {
          product(id: $id) {
            id
            title
            metafields(first: $first, namespace: $namespace, after: $after) {
              edges {
                node {
                  id
                  namespace
                  key
                  value
                  type
                  description
                  createdAt
                  updatedAt
                }
              }
              pageInfo {
                hasNextPage
                endCursor
              }
            }
          }
        }
      `;

      const variables: {
        id: string;
        first: number;
        namespace?: string;
        after?: string;
      } = {
        id: productId,
        first: limit
      };

      if (namespace) {
        variables.namespace = namespace;
      }

      if (after) {
        variables.after = after;
      }

      const data = (await shopifyClient.request(query, variables)) as GetProductMetafieldsResponse;

      if (!data.product) {
        throw new Error(`Product with ID ${productId} not found`);
      }

      // Format metafields for response
      const metafields = data.product.metafields.edges.map((edge) => ({
        id: edge.node.id,
        namespace: edge.node.namespace,
        key: edge.node.key,
        value: edge.node.value,
        type: edge.node.type,
        description: edge.node.description,
        createdAt: edge.node.createdAt,
        updatedAt: edge.node.updatedAt
      }));

      return {
        productId: data.product.id,
        productTitle: data.product.title,
        metafields,
        pageInfo: data.product.metafields.pageInfo
      };
    } catch (error) {
      console.error("Error fetching product metafields:", error);
      throw new Error(
        `Failed to fetch product metafields: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }
};

export { getProductMetafields };
