import type { GraphQLClient } from "graphql-request";
import { gql } from "graphql-request";
import { z } from "zod";

// Input schema for getThemes
const GetThemesInputSchema = z.object({
  first: z.number().min(1).max(50).optional().describe("Number of themes to return (default: 10, max: 50)")
});

type GetThemesInput = z.infer<typeof GetThemesInputSchema>;

interface ThemesResponse {
  themes: {
    edges: Array<{
      node: {
        id: string;
        name: string;
        role: string;
        processing: boolean;
        createdAt: string;
        updatedAt: string;
        themeStoreId: number | null;
      };
    }>;
  };
}

// Will be initialized in index.ts
let shopifyClient: GraphQLClient;

/**
 * Tool for getting all themes in the store
 * @returns {Object} List of themes
 */
const getThemes = {
  name: "get-themes",
  description: "Get all themes in the Shopify store. Returns theme ID, name, role (MAIN, UNPUBLISHED, DEMO, DEVELOPMENT), and processing status.",
  schema: GetThemesInputSchema,

  initialize(client: GraphQLClient) {
    shopifyClient = client;
  },

  execute: async (input: GetThemesInput) => {
    if (!shopifyClient) {
      throw new Error("GraphQL client not initialized. Call initialize() first.");
    }
    try {
      const { first = 10 } = input;

      const query = gql`
        query GetThemes($first: Int!) {
          themes(first: $first) {
            edges {
              node {
                id
                name
                role
                processing
                createdAt
                updatedAt
                themeStoreId
              }
            }
          }
        }
      `;

      const variables = { first };

      const data = (await shopifyClient.request(query, variables)) as ThemesResponse;

      const themes = data.themes.edges.map((edge) => ({
        id: edge.node.id,
        name: edge.node.name,
        role: edge.node.role,
        isLive: edge.node.role === "MAIN",
        processing: edge.node.processing,
        createdAt: edge.node.createdAt,
        updatedAt: edge.node.updatedAt,
        themeStoreId: edge.node.themeStoreId
      }));

      return {
        themes,
        totalCount: themes.length,
        liveTheme: themes.find(t => t.role === "MAIN") || null
      };
    } catch (error) {
      console.error("Error getting themes:", error);
      throw new Error(
        `Failed to get themes: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }
};

export { getThemes };
