import type { GraphQLClient } from "graphql-request";
import { gql } from "graphql-request";
import { z } from "zod";

// Input schema for getMenus
const GetMenusInputSchema = z.object({
  first: z.number().min(1).max(50).optional().describe("Number of menus to return (default: 20, max: 50)")
});

type GetMenusInput = z.infer<typeof GetMenusInputSchema>;

interface MenusResponse {
  menus: {
    edges: Array<{
      node: {
        id: string;
        title: string;
        handle: string;
        itemsCount: number;
        items: Array<{
          id: string;
          title: string;
          url: string | null;
          type: string;
          resourceId: string | null;
          items: Array<{
            id: string;
            title: string;
            url: string | null;
            type: string;
          }>;
        }>;
      };
    }>;
  };
}

// Will be initialized in index.ts
let shopifyClient: GraphQLClient;

/**
 * Tool for getting all navigation menus
 * @returns {Object} List of menus with their items
 */
const getMenus = {
  name: "get-menus",
  description: "Get all navigation menus in the Shopify store with their menu items and nested structure.",
  schema: GetMenusInputSchema,

  initialize(client: GraphQLClient) {
    shopifyClient = client;
  },

  execute: async (input: GetMenusInput) => {
    if (!shopifyClient) {
      throw new Error("GraphQL client not initialized. Call initialize() first.");
    }
    try {
      const { first = 20 } = input;

      const query = gql`
        query GetMenus($first: Int!) {
          menus(first: $first) {
            edges {
              node {
                id
                title
                handle
                itemsCount
                items {
                  id
                  title
                  url
                  type
                  resourceId
                  items {
                    id
                    title
                    url
                    type
                  }
                }
              }
            }
          }
        }
      `;

      const variables = { first };

      const data = (await shopifyClient.request(query, variables)) as MenusResponse;

      const menus = data.menus.edges.map((edge) => ({
        id: edge.node.id,
        title: edge.node.title,
        handle: edge.node.handle,
        itemsCount: edge.node.itemsCount,
        items: edge.node.items.map(item => ({
          id: item.id,
          title: item.title,
          url: item.url,
          type: item.type,
          resourceId: item.resourceId,
          items: item.items.map(subItem => ({
            id: subItem.id,
            title: subItem.title,
            url: subItem.url,
            type: subItem.type
          }))
        }))
      }));

      return {
        menus,
        totalCount: menus.length
      };
    } catch (error) {
      console.error("Error getting menus:", error);
      throw new Error(
        `Failed to get menus: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }
};

export { getMenus };
