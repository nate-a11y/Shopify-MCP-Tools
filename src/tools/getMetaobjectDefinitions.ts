import type { GraphQLClient } from "graphql-request";
import { gql } from "graphql-request";
import { z } from "zod";

// Input schema for getMetaobjectDefinitions
const GetMetaobjectDefinitionsInputSchema = z.object({
  first: z.number().min(1).max(250).optional().describe("Number of definitions to return (default: 50, max: 250)"),
  after: z.string().optional().describe("Cursor for pagination")
});

type GetMetaobjectDefinitionsInput = z.infer<typeof GetMetaobjectDefinitionsInputSchema>;

interface MetaobjectDefinitionsResponse {
  metaobjectDefinitions: {
    edges: Array<{
      node: {
        id: string;
        type: string;
        name: string;
        description: string | null;
        displayNameKey: string | null;
        fieldDefinitions: Array<{
          key: string;
          name: string;
          description: string | null;
          type: {
            name: string;
          };
          required: boolean;
        }>;
        access: {
          storefront: string;
        };
        capabilities: {
          publishable: {
            enabled: boolean;
          };
          translatable: {
            enabled: boolean;
          };
        };
        metaobjectsCount: number;
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
 * Tool for getting all metaobject definitions
 * @returns {Object} List of metaobject definitions
 */
const getMetaobjectDefinitions = {
  name: "get-metaobject-definitions",
  description: "Get all metaobject definitions (schemas) in the store. Returns type, fields, access settings, and entry counts.",
  schema: GetMetaobjectDefinitionsInputSchema,

  initialize(client: GraphQLClient) {
    shopifyClient = client;
  },

  execute: async (input: GetMetaobjectDefinitionsInput) => {
    if (!shopifyClient) {
      throw new Error("GraphQL client not initialized. Call initialize() first.");
    }
    try {
      const { first = 50, after } = input;

      const query = gql`
        query GetMetaobjectDefinitions($first: Int!, $after: String) {
          metaobjectDefinitions(first: $first, after: $after) {
            edges {
              node {
                id
                type
                name
                description
                displayNameKey
                fieldDefinitions {
                  key
                  name
                  description
                  type {
                    name
                  }
                  required
                }
                access {
                  storefront
                }
                capabilities {
                  publishable {
                    enabled
                  }
                  translatable {
                    enabled
                  }
                }
                metaobjectsCount
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
        first: number;
        after?: string;
      } = { first };

      if (after) {
        variables.after = after;
      }

      const data = (await shopifyClient.request(query, variables)) as MetaobjectDefinitionsResponse;

      const definitions = data.metaobjectDefinitions.edges.map((edge) => ({
        id: edge.node.id,
        type: edge.node.type,
        name: edge.node.name,
        description: edge.node.description,
        displayNameKey: edge.node.displayNameKey,
        fieldDefinitions: edge.node.fieldDefinitions.map(field => ({
          key: field.key,
          name: field.name,
          description: field.description,
          type: field.type.name,
          required: field.required
        })),
        access: edge.node.access,
        capabilities: edge.node.capabilities,
        metaobjectsCount: edge.node.metaobjectsCount,
        cursor: edge.cursor
      }));

      return {
        definitions,
        pageInfo: data.metaobjectDefinitions.pageInfo,
        totalCount: definitions.length
      };
    } catch (error) {
      console.error("Error getting metaobject definitions:", error);
      throw new Error(
        `Failed to get metaobject definitions: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }
};

export { getMetaobjectDefinitions };
