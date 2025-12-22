import type { GraphQLClient } from "graphql-request";
import { gql } from "graphql-request";
import { z } from "zod";

// Recursive menu item schema
const MenuItemInputSchema: z.ZodType<{
  title: string;
  url?: string;
  resourceId?: string;
  items?: MenuItemInput[];
}> = z.object({
  title: z.string().min(1).describe("The title/label of the menu item"),
  url: z.string().optional().describe("The URL the menu item links to (use this OR resourceId, not both)"),
  resourceId: z.string().optional().describe("The GID of a Shopify resource to link to (e.g., 'gid://shopify/Product/123'). Use this OR url, not both."),
  items: z.lazy(() => z.array(MenuItemInputSchema).optional()).describe("Nested child menu items")
});

type MenuItemInput = z.infer<typeof MenuItemInputSchema>;

// Input schema for createMenu
const CreateMenuInputSchema = z.object({
  title: z.string().min(1).describe("The title of the menu (e.g., 'Main Menu', 'Footer Menu')"),
  handle: z.string().min(1).describe("The handle/slug for the menu (e.g., 'main-menu', 'footer')"),
  items: z.array(MenuItemInputSchema).optional().describe("Array of menu items to add to the menu")
});

type CreateMenuInput = z.infer<typeof CreateMenuInputSchema>;

interface MenuCreateResponse {
  menuCreate: {
    menu: {
      id: string;
      title: string;
      handle: string;
      items: Array<{
        id: string;
        title: string;
        url: string | null;
        resource: {
          __typename: string;
        } | null;
        items: Array<{
          id: string;
          title: string;
          url: string | null;
        }>;
      }>;
    } | null;
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
 * Tool for creating navigation menus
 * @returns {Object} Created menu details
 */
const createMenu = {
  name: "create-menu",
  description: "Create a new navigation menu for the online store. Menus can include links to pages, collections, products, or custom URLs, and can have nested sub-menus.",
  schema: CreateMenuInputSchema,

  initialize(client: GraphQLClient) {
    shopifyClient = client;
  },

  execute: async (input: CreateMenuInput) => {
    if (!shopifyClient) {
      throw new Error("GraphQL client not initialized. Call initialize() first.");
    }
    try {
      const { title, handle, items } = input;

      const mutation = gql`
        mutation menuCreate($title: String!, $handle: String!, $items: [MenuItemCreateInput!]) {
          menuCreate(title: $title, handle: $handle, items: $items) {
            menu {
              id
              title
              handle
              items {
                id
                title
                url
                resource {
                  __typename
                }
                items {
                  id
                  title
                  url
                }
              }
            }
            userErrors {
              field
              message
              code
            }
          }
        }
      `;

      // Transform items to the format expected by the API
      const transformItems = (menuItems?: MenuItemInput[]): Array<{
        title: string;
        url?: string;
        resourceId?: string;
        items?: Array<{
          title: string;
          url?: string;
          resourceId?: string;
        }>;
      }> | undefined => {
        if (!menuItems) return undefined;
        return menuItems.map(item => ({
          title: item.title,
          url: item.url,
          resourceId: item.resourceId,
          items: item.items ? transformItems(item.items) : undefined
        }));
      };

      const variables = {
        title,
        handle,
        items: transformItems(items)
      };

      const data = (await shopifyClient.request(mutation, variables)) as MenuCreateResponse;

      if (data.menuCreate.userErrors.length > 0) {
        throw new Error(
          `Failed to create menu: ${data.menuCreate.userErrors
            .map((error) => `${error.message} (${error.code})`)
            .join(", ")}`
        );
      }

      if (!data.menuCreate.menu) {
        throw new Error("Menu creation failed: No menu returned");
      }

      const menu = data.menuCreate.menu;

      return {
        success: true,
        menu: {
          id: menu.id,
          title: menu.title,
          handle: menu.handle,
          items: menu.items.map(item => ({
            id: item.id,
            title: item.title,
            url: item.url,
            resourceType: item.resource?.__typename || null,
            items: item.items.map(subItem => ({
              id: subItem.id,
              title: subItem.title,
              url: subItem.url
            }))
          }))
        }
      };
    } catch (error) {
      console.error("Error creating menu:", error);
      throw new Error(
        `Failed to create menu: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }
};

export { createMenu };
