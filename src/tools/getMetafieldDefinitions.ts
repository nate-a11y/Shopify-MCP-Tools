import type { GraphQLClient } from "graphql-request";
import { gql } from "graphql-request";
import { z } from "zod";

// Input schema for getMetafieldDefinitions
const GetMetafieldDefinitionsInputSchema = z.object({
  ownerType: z.enum([
    "PRODUCT",
    "PRODUCTVARIANT",
    "COLLECTION",
    "CUSTOMER",
    "ORDER",
    "DRAFTORDER",
    "LOCATION",
    "PAGE",
    "BLOG",
    "ARTICLE",
    "MARKET",
    "SHOP"
  ]).describe("The resource type to get metafield definitions for"),
  namespace: z.string().optional().describe("Optional: Filter by namespace"),
  first: z.number().min(1).max(250).optional().describe("Number of definitions to return (default: 50, max: 250)"),
  after: z.string().optional().describe("Cursor for pagination")
});

type GetMetafieldDefinitionsInput = z.infer<typeof GetMetafieldDefinitionsInputSchema>;

interface MetafieldDefinitionsResponse {
  metafieldDefinitions: {
    edges: Array<{
      node: {
        id: string;
        name: string;
        namespace: string;
        key: string;
        description: string | null;
        type: {
          name: string;
        };
        ownerType: string;
        pinnedPosition: number | null;
        validations: Array<{
          name: string;
          value: string | null;
        }>;
        metafieldsCount: number;
      };
      cursor: string;
    }>;
    pageInfo: {
      hasNextPage: boolean;
      hasPreviousPage: boolean;
      startCursor: string | null;
      endCursor: string | null;
    };
  };
}

// Will be initialized in index.ts
let shopifyClient: GraphQLClient;

/**
 * Tool for getting metafield definitions for a resource type
 * @returns {Object} List of metafield definitions
 */
const getMetafieldDefinitions = {
  name: "get-metafield-definitions",
  description: "Get all metafield definitions for a specific resource type (Product, Variant, Collection, Customer, Order, etc.). Optionally filter by namespace.",
  schema: GetMetafieldDefinitionsInputSchema,

  initialize(client: GraphQLClient) {
    shopifyClient = client;
  },

  execute: async (input: GetMetafieldDefinitionsInput) => {
    if (!shopifyClient) {
      throw new Error("GraphQL client not initialized. Call initialize() first.");
    }
    try {
      const { ownerType, namespace, first = 50, after } = input;

      const query = gql`
        query GetMetafieldDefinitions($ownerType: MetafieldOwnerType!, $namespace: String, $first: Int!, $after: String) {
          metafieldDefinitions(ownerType: $ownerType, namespace: $namespace, first: $first, after: $after) {
            edges {
              node {
                id
                name
                namespace
                key
                description
                type {
                  name
                }
                ownerType
                pinnedPosition
                validations {
                  name
                  value
                }
                metafieldsCount
              }
              cursor
            }
            pageInfo {
              hasNextPage
              hasPreviousPage
              startCursor
              endCursor
            }
          }
        }
      `;

      const variables: {
        ownerType: string;
        namespace?: string;
        first: number;
        after?: string;
      } = {
        ownerType,
        first
      };

      if (namespace) {
        variables.namespace = namespace;
      }

      if (after) {
        variables.after = after;
      }

      const data = (await shopifyClient.request(query, variables)) as MetafieldDefinitionsResponse;

      const definitions = data.metafieldDefinitions.edges.map((edge) => ({
        id: edge.node.id,
        name: edge.node.name,
        namespace: edge.node.namespace,
        key: edge.node.key,
        fullKey: `${edge.node.namespace}.${edge.node.key}`,
        description: edge.node.description,
        type: edge.node.type.name,
        ownerType: edge.node.ownerType,
        pinnedPosition: edge.node.pinnedPosition,
        validations: edge.node.validations,
        metafieldsCount: edge.node.metafieldsCount,
        cursor: edge.cursor
      }));

      return {
        definitions,
        pageInfo: data.metafieldDefinitions.pageInfo,
        totalCount: definitions.length
      };
    } catch (error) {
      console.error("Error getting metafield definitions:", error);
      throw new Error(
        `Failed to get metafield definitions: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }
};

export { getMetafieldDefinitions };
