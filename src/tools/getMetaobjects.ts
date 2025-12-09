import type { GraphQLClient } from "graphql-request";
import { gql } from "graphql-request";
import { z } from "zod";

// Input schema for getMetaobjects
const GetMetaobjectsInputSchema = z.object({
  type: z.string().min(1).describe("The metaobject type to fetch (e.g., \"custom_type\", \"lookbook\"). This is the type handle defined in your Shopify admin."),
  limit: z.number().default(20).describe("Maximum number of metaobjects to return (default: 20)"),
  after: z.string().optional().describe("Cursor for pagination - fetch items after this cursor"),
  reverse: z.boolean().default(false).describe("Reverse the order of results")
});

type GetMetaobjectsInput = z.infer<typeof GetMetaobjectsInputSchema>;

interface MetaobjectField {
  key: string;
  value: string;
  type: string;
}

interface MetaobjectNode {
  id: string;
  handle: string;
  type: string;
  displayName: string;
  updatedAt: string;
  fields: MetaobjectField[];
}

interface GetMetaobjectsResponse {
  metaobjects: {
    edges: Array<{
      cursor: string;
      node: MetaobjectNode;
    }>;
    pageInfo: {
      hasNextPage: boolean;
      hasPreviousPage: boolean;
      startCursor: string;
      endCursor: string;
    };
  };
}

// Will be initialized in index.ts
let shopifyClient: GraphQLClient;

/**
 * Tool for fetching metaobjects by type
 * @returns {Object} List of metaobjects with their fields
 */
const getMetaobjects = {
  name: "get-metaobjects",
  description: "Get metaobjects by type. Metaobjects are custom data structures defined in Shopify admin under Settings > Custom data.",
  schema: GetMetaobjectsInputSchema,

  initialize(client: GraphQLClient) {
    shopifyClient = client;
  },

  execute: async (input: GetMetaobjectsInput) => {
    try {
      const { type, limit, after, reverse } = input;

      const query = gql`
        query GetMetaobjects($type: String!, $first: Int!, $after: String, $reverse: Boolean) {
          metaobjects(type: $type, first: $first, after: $after, reverse: $reverse) {
            edges {
              cursor
              node {
                id
                handle
                type
                displayName
                updatedAt
                fields {
                  key
                  value
                  type
                }
              }
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

      const variables = {
        type,
        first: limit,
        after: after || null,
        reverse
      };

      const data = (await shopifyClient.request(query, variables)) as GetMetaobjectsResponse;

      // Format metaobjects for response
      const metaobjects = data.metaobjects.edges.map((edge) => {
        // Convert fields array to a key-value object for easier consumption
        const fieldsObject: Record<string, { value: string; type: string }> = {};
        edge.node.fields.forEach((field) => {
          fieldsObject[field.key] = {
            value: field.value,
            type: field.type
          };
        });

        return {
          id: edge.node.id,
          handle: edge.node.handle,
          type: edge.node.type,
          displayName: edge.node.displayName,
          updatedAt: edge.node.updatedAt,
          fields: fieldsObject,
          fieldsArray: edge.node.fields, // Also include array format
          cursor: edge.cursor
        };
      });

      return {
        metaobjects,
        pageInfo: data.metaobjects.pageInfo,
        totalCount: metaobjects.length
      };
    } catch (error) {
      console.error("Error fetching metaobjects:", error);
      throw new Error(
        `Failed to fetch metaobjects: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }
};

export { getMetaobjects };
