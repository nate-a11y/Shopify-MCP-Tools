import type { GraphQLClient } from "graphql-request";
import { gql } from "graphql-request";
import { z } from "zod";

// Menu item update schema (for updating existing items)
const MenuItemUpdateSchema = z.object({
  id: z.string().min(1).describe("The GID of the menu item to update"),
  title: z.string().optional().describe("The new title for the menu item"),
  url: z.string().optional().describe("The new URL for the menu item"),
  resourceId: z.string().optional().describe("The new resource GID to link to")
});

// Menu item create schema (for adding new items)
const MenuItemCreateSchema = z.object({
  title: z.string().min(1).describe("The title of the new menu item"),
  url: z.string().optional().describe("The URL the menu item links to"),
  resourceId: z.string().optional().describe("The GID of a Shopify resource to link to")
});

// Input schema for updateMenu
const UpdateMenuInputSchema = z.object({
  id: z.string().min(1).describe("The GID of the menu to update (e.g., 'gid://shopify/Menu/123456')"),
  title: z.string().optional().describe("The new title for the menu"),
  handle: z.string().optional().describe("The new handle/slug for the menu"),
  itemsToUpdate: z.array(MenuItemUpdateSchema).optional().describe("Existing menu items to update"),
  itemsToAdd: z.array(MenuItemCreateSchema).optional().describe("New menu items to add"),
  itemsToRemove: z.array(z.string()).optional().describe("GIDs of menu items to remove")
});

type UpdateMenuInput = z.infer<typeof UpdateMenuInputSchema>;

interface MenuUpdateResponse {
  menuUpdate: {
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
 * Tool for updating navigation menus
 * @returns {Object} Updated menu details
 */
const updateMenu = {
  name: "update-menu",
  description: "Update an existing navigation menu. You can modify the menu title/handle, update existing items, add new items, or remove items.",
  schema: UpdateMenuInputSchema,

  initialize(client: GraphQLClient) {
    shopifyClient = client;
  },

  execute: async (input: UpdateMenuInput) => {
    if (!shopifyClient) {
      throw new Error("GraphQL client not initialized. Call initialize() first.");
    }
    try {
      const { id, title, handle, itemsToUpdate, itemsToAdd, itemsToRemove } = input;

      const mutation = gql`
        mutation menuUpdate($id: ID!, $title: String, $handle: String, $items: [MenuItemUpdateInput!]) {
          menuUpdate(id: $id, title: $title, handle: $handle, items: $items) {
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

      // Build the items array for the mutation
      const items: Array<{
        id?: string;
        title?: string;
        url?: string;
        resourceId?: string;
        remove?: boolean;
      }> = [];

      // Add items to update
      if (itemsToUpdate) {
        itemsToUpdate.forEach(item => {
          items.push({
            id: item.id,
            title: item.title,
            url: item.url,
            resourceId: item.resourceId
          });
        });
      }

      // Add new items (without id)
      if (itemsToAdd) {
        itemsToAdd.forEach(item => {
          items.push({
            title: item.title,
            url: item.url,
            resourceId: item.resourceId
          });
        });
      }

      // Mark items for removal
      if (itemsToRemove) {
        itemsToRemove.forEach(itemId => {
          items.push({
            id: itemId,
            remove: true
          });
        });
      }

      const variables: {
        id: string;
        title?: string;
        handle?: string;
        items?: typeof items;
      } = { id };

      if (title !== undefined) {
        variables.title = title;
      }

      if (handle !== undefined) {
        variables.handle = handle;
      }

      if (items.length > 0) {
        variables.items = items;
      }

      const data = (await shopifyClient.request(mutation, variables)) as MenuUpdateResponse;

      if (data.menuUpdate.userErrors.length > 0) {
        throw new Error(
          `Failed to update menu: ${data.menuUpdate.userErrors
            .map((error) => `${error.message} (${error.code})`)
            .join(", ")}`
        );
      }

      if (!data.menuUpdate.menu) {
        throw new Error("Menu update failed: No menu returned");
      }

      const menu = data.menuUpdate.menu;

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
      console.error("Error updating menu:", error);
      throw new Error(
        `Failed to update menu: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }
};

export { updateMenu };
